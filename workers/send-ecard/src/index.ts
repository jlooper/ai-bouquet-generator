/**
 * POST JSON: { to, replyTo, personalMessage?, bouquetMeaning?, imageUrl?, imageBase64?, imageMimeType? }
 * imageUrl: HTTPS URL (trusted hosts use Resend CID inline fetch).
 * imageBase64: raw or data-URI base64 for Gemini/generated images — no Cloudinary required.
 */

export interface Env {
  RESEND_API_KEY: string;
  FROM_EMAIL: string;
  ALLOWED_ORIGINS: string;
}

const MAX_MESSAGE = 8000;
const MAX_MEANING = 12000;
/** ~3.5MiB decoded — keeps Worker + Resend payloads reasonable */
const MAX_IMAGE_BASE64_CHARS = 6_000_000;

/** Normalize key from Wrangler secrets / .dev.vars (quotes, "Bearer ", stray # comments). */
function normalizeResendApiKey(raw: string): string {
  let k = String(raw ?? "").trim().replace(/\r$/, "");
  if (k.toLowerCase().startsWith("bearer ")) {
    k = k.slice(7).trim();
  }
  const hash = k.indexOf(" #");
  if (hash !== -1) {
    k = k.slice(0, hash).trim();
  }
  if (
    (k.startsWith('"') && k.endsWith('"')) ||
    (k.startsWith("'") && k.endsWith("'"))
  ) {
    k = k.slice(1, -1).trim();
  }
  return k;
}

function json(data: unknown, status = 200, corsHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function isValidEmail(e: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim()) && e.length <= 320;
}

function isHttpsUrl(u: string): boolean {
  try {
    const url = new URL(u);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

/** Hosts we allow as Resend attachment `path` (avoids open SSRF). */
function isTrustedImageHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h === "res.cloudinary.com" || h.endsWith(".cloudinary.com");
}

/** RFC4648 — Resend rejects bad padding / URL-safe alphabets silently for some clients */
function normalizeInlineImageBase64(b64: string): string | null {
  let s = b64.replace(/\s/g, "").replace(/-/g, "+").replace(/_/g, "/");
  const pad = s.length % 4;
  if (pad === 2) {
    s += "==";
  } else if (pad === 3) {
    s += "=";
  } else if (pad === 1) {
    return null;
  }
  try {
    atob(s);
    return s;
  } catch {
    return null;
  }
}

function corsForOrigin(request: Request, env: Env): Record<string, string> | null {
  const origin = request.headers.get("Origin");
  const allowed = (env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  const base = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };

  // Non-browser or same-origin tools without Origin: no CORS headers needed
  if (!origin) {
    return {};
  }

  if (!allowed.includes(origin)) {
    return null;
  }

  return {
    ...base,
    "Access-Control-Allow-Origin": origin,
  };
}

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const cors = corsForOrigin(request, env);
    if (cors === null) {
      return json({ ok: false, error: "Origin not allowed" }, 403);
    }
    const corsHeaders = cors;

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return json({ ok: false, error: "Method not allowed" }, 405, corsHeaders);
    }

    const resendKey = normalizeResendApiKey(String(env.RESEND_API_KEY || ""));
    if (!resendKey) {
      return json({ ok: false, error: "Server misconfigured" }, 500, corsHeaders);
    }

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return json({ ok: false, error: "Invalid JSON" }, 400, corsHeaders);
    }

    const to = typeof body.to === "string" ? body.to.trim() : "";
    const replyTo = typeof body.replyTo === "string" ? body.replyTo.trim() : "";
    const personalMessage =
      typeof body.personalMessage === "string" ? body.personalMessage.slice(0, MAX_MESSAGE) : "";
    const bouquetMeaning =
      typeof body.bouquetMeaning === "string" ? body.bouquetMeaning.slice(0, MAX_MEANING) : "";
    const imageUrl = typeof body.imageUrl === "string" ? body.imageUrl.trim() : "";
    let imageBase64 = typeof body.imageBase64 === "string" ? body.imageBase64.trim() : "";
    const imageMimeType =
      typeof body.imageMimeType === "string" && body.imageMimeType.trim().length > 0
        ? body.imageMimeType.trim().split(";")[0]?.trim() || "image/jpeg"
        : "image/jpeg";

    /* Allow full data URLs in imageBase64 field (strip prefix) */
    if (imageBase64.startsWith("data:")) {
      const comma = imageBase64.indexOf(",");
      if (comma !== -1) {
        imageBase64 = imageBase64.slice(comma + 1).replace(/\s/g, "");
      }
    } else {
      imageBase64 = imageBase64.replace(/\s/g, "");
    }

    if (imageBase64.length > 0) {
      const normalized = normalizeInlineImageBase64(imageBase64);
      if (!normalized) {
        return json(
          { ok: false, error: "Invalid bouquet image encoding. Try generating the image again." },
          400,
          corsHeaders
        );
      }
      imageBase64 = normalized;
    }

    if (!to || !isValidEmail(to)) {
      return json({ ok: false, error: "Invalid recipient email" }, 400, corsHeaders);
    }
    if (!replyTo || !isValidEmail(replyTo)) {
      return json({ ok: false, error: "Invalid sender email" }, 400, corsHeaders);
    }
    if (imageUrl && !isHttpsUrl(imageUrl)) {
      return json({ ok: false, error: "imageUrl must be an https URL" }, 400, corsHeaders);
    }

    if (imageBase64.length > MAX_IMAGE_BASE64_CHARS) {
      return json(
        {
          ok: false,
          error: "Attached image is too large. Try sending without image or use a hosted image URL.",
        },
        413,
        corsHeaders
      );
    }

    const from = env.FROM_EMAIL || "Flora <onboarding@resend.dev>";
    const safeMessage = escapeHtml(personalMessage || "Sending you this bouquet to brighten your day!");
    const safeMeaning = escapeHtml(bouquetMeaning);

    const BOUQUET_CID = "tussie-bouquet-img";
    let imageBlock = "";
    /* REST shape per Resend docs (content_id); Node SDK aliases contentId — include both so either parser wins. */
    let attachments: Record<string, unknown>[] | undefined;

    if (imageBase64.length > 0) {
      const mime = imageMimeType.toLowerCase();
      const filename = mime.includes("png")
        ? "bouquet.png"
        : mime.includes("webp")
          ? "bouquet.webp"
          : "bouquet.jpg";
      imageBlock = `<div style="text-align:center;margin:24px 0;"><img src="cid:${BOUQUET_CID}" alt="Your tussie mussie bouquet" style="width:560px;max-width:100%;height:auto;border-radius:8px;border:0;outline:none;display:block;margin:0 auto;" /></div>`;
      attachments = [
        {
          filename,
          content: imageBase64,
          content_id: BOUQUET_CID,
          content_type: mime,
          contentId: BOUQUET_CID,
          contentType: mime,
        },
      ];
    } else if (imageUrl) {
      let host = "";
      try {
        host = new URL(imageUrl).hostname;
      } catch {
        /* handled by isHttpsUrl earlier */
      }
      if (isTrustedImageHost(host)) {
        imageBlock = `<div style="text-align:center;margin:24px 0;"><img src="cid:${BOUQUET_CID}" alt="Your tussie mussie bouquet" style="width:560px;max-width:100%;height:auto;border-radius:8px;border:0;outline:none;display:block;margin:0 auto;" /></div>`;
        attachments = [
          {
            path: imageUrl,
            filename: imageUrl.toLowerCase().includes(".png") ? "bouquet.png" : "bouquet.jpg",
            content_id: BOUQUET_CID,
            contentId: BOUQUET_CID,
          },
        ];
      } else {
        imageBlock = `<div style="text-align:center;margin:20px 0;"><img src="${escapeHtml(imageUrl)}" alt="Bouquet" width="560" style="max-width:100%;height:auto;border-radius:8px;" /></div>`;
      }
    }

    const html = `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f1f5;font-family:Georgia,serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f1f5;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(82,24,53,0.1);border:1px solid #ead4df;">
          <tr>
            <td style="padding:28px 24px;background:#521835;color:#fefcfd;font-size:22px;font-weight:bold;text-align:center;">
              You've got flowers!
            </td>
          </tr>
          <tr>
            <td style="padding:24px;">
              ${imageBlock}
              <p style="color:#37392e;font-size:16px;line-height:1.6;margin:0 0 16px;">${safeMessage}</p>
              <div style="background:#f7edf2;padding:16px;border-radius:8px;margin-top:8px;border:1px solid #e8ccd8;">
                <h3 style="color:#57406e;margin:0 0 8px;font-size:16px;">Your bouquet meaning</h3>
                <p style="color:#37392e;font-size:14px;line-height:1.5;margin:0;">${safeMeaning}</p>
              </div>
              <p style="color:#5c5f52;font-size:13px;margin:24px 0 0;line-height:1.5;">
                From the <a href="https://tussie-mussies.netlify.app" style="color:#521835;">Tussie Mussie Generator</a> — floriography, the language of flowers.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const subject =
      typeof body.subject === "string" && body.subject.trim().length > 0
        ? String(body.subject).slice(0, 200)
        : `A Tussie Mussie for you`;

    const resendBody: Record<string, unknown> = {
      from,
      to: [to],
      subject,
      html,
      reply_to: replyTo,
    };
    if (attachments?.length) {
      resendBody.attachments = attachments;
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(resendBody),
    });

    const resText = await res.text();
    if (!res.ok) {
      let detail = resText;
      try {
        const errJson = JSON.parse(resText) as { message?: string };
        if (errJson?.message) detail = errJson.message;
      } catch {
        /* use raw */
      }
      let hint = "";
      if (/api key is invalid|invalid api key/i.test(detail)) {
        hint =
          " Check RESEND_API_KEY in workers/send-ecard/.dev.vars (local) or Cloudflare Worker secrets (deployed). Run: npm run verify-resend";
      } else if (
        /only send (?:test(?:ing)? )?emails to your own|verify a domain at resend/i.test(detail)
      ) {
        hint =
          " To send to anyone: add and verify your domain at https://resend.com/domains, then set Worker FROM_EMAIL to an address @ that domain (Cloudflare → Workers → your worker → Variables).";
      }
      return json(
        { ok: false, error: `${detail || "Email send failed"}${hint}` },
        502,
        corsHeaders
      );
    }

    return json({ ok: true }, 200, corsHeaders);
  },
};
