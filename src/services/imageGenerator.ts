import { GEMINI_API_KEY } from "astro:env/client";

/** Image-capable Gemini model (Google AI Studio key). See https://ai.google.dev/gemini-api/docs/image-generation */
const GEMINI_IMAGE_MODEL = "gemini-2.5-flash-image";

const GEMINI_GENERATE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_IMAGE_MODEL}:generateContent`;

/**
 * Text-to-image via Gemini API (native image output).
 */
export async function generateBouquetImage(flowers: string[]): Promise<string> {
  const key = GEMINI_API_KEY?.trim();
  if (!key) {
    console.error(
      "Missing GEMINI_API_KEY. Add it to .env and restart the dev server."
    );
    throw new Error("Missing Gemini API key. Please check your .env file.");
  }

  const prompt = `A beautiful professional photograph of a miniature hand-held flower bouquet containing only one of each of the following flowers: ${flowers.join(", ")}, 
    detailed, high resolution, studio lighting, small hand-held nosegay, centered composition, presented as a small ribbon-tied bouquet with only one of each of the named flowers, gathered into a small cone-shaped silver metal victorian-style tussie mussie bouquet holder decorated with a frill of lace and tied with dangling ribbons. Do not show a hand or any part of a human being or person, only show the bouquet.`;

  try {
    const response = await fetch(GEMINI_GENERATE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": key,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
      }),
    });

    const rawText = await response.text();
    let payload: Record<string, unknown> = {};
    try {
      payload = rawText ? (JSON.parse(rawText) as Record<string, unknown>) : {};
    } catch {
      /* non-JSON body */
    }

    if (!response.ok) {
      const errObj = payload.error as Record<string, unknown> | undefined;
      const msg =
        typeof errObj?.message === "string"
          ? errObj.message
          : rawText.slice(0, 300) || response.statusText;
      console.error("Gemini API error:", response.status, msg);
      const statusName =
        typeof errObj?.status === "string" ? errObj.status : "";
      const quotaHit =
        response.status === 429 ||
        statusName === "RESOURCE_EXHAUSTED" ||
        /quota|rate limit|exceeded/i.test(msg);
      if (quotaHit) {
        throw new Error(
          "Gemini quota or rate limit reached. Check usage in Google AI Studio, wait for the daily reset, or enable billing for higher limits."
        );
      }
      throw new Error(`Gemini API failed (${response.status}): ${msg}`);
    }

    const extracted = extractGeminiImage(payload);
    if (!extracted) {
      const block =
        (payload.promptFeedback as { blockReason?: string } | undefined)
          ?.blockReason;
      if (block) {
        throw new Error(`Image request blocked: ${block}`);
      }
      console.error("Unexpected Gemini response:", payload);
      throw new Error("No image data in Gemini response");
    }

    const { base64, mimeType } = extracted;
    const mime = mimeType || "image/png";
    return `data:${mime};base64,${base64}`;
  } catch (error) {
    console.error("Error generating image:", error);
    if (error instanceof Error) throw error;
    throw new Error("Image generation failed.");
  }
}

function extractGeminiImage(
  data: Record<string, unknown>
): { base64: string; mimeType?: string } | null {
  const candidates = data.candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) return null;

  const parts = (
    candidates[0] as { content?: { parts?: unknown[] } }
  )?.content?.parts;
  if (!Array.isArray(parts)) return null;

  for (const part of parts) {
    if (!part || typeof part !== "object") continue;
    const inline = (part as { inlineData?: { data?: string; mimeType?: string } })
      .inlineData;
    if (inline?.data && typeof inline.data === "string" && inline.data.length > 0) {
      return { base64: inline.data, mimeType: inline.mimeType };
    }
  }
  return null;
}
