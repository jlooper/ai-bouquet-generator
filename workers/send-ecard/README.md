# Send e-card Worker (Cloudflare + Resend)

This Worker receives `POST` requests from the static Astro site, validates input, and sends HTML e-cards through [Resend](https://resend.com). Your **Resend API key never ships** in the frontend bundle.

**Going to production:** deploy this Worker first, set **`RESEND_API_KEY`** as a Cloudflare secret (not only `.dev.vars`), align **`ALLOWED_ORIGINS`** with your live site origin, then set **`PUBLIC_ECARD_API_URL`** on Netlify to this Worker’s URL. Full order-of-operations: [../README.md#production-checklist](../README.md#production-checklist).

## Setup

1. Install dependencies (from this folder):

   ```sh
   cd workers/send-ecard && npm install
   ```

2. Create a [Resend](https://resend.com) account and an **API key** (starts with `re_`).

3. **Local Worker (`npm run dev` in this folder):** secrets from `wrangler secret put` are **not** used the same way. Create a file named **`.dev.vars`** next to `wrangler.toml`:

   ```sh
   cp .dev.vars.example .dev.vars
   ```

   Edit `.dev.vars` and set `RESEND_API_KEY=re_...` with **only** the key (no `Bearer ` prefix, no quotes). Wrangler reads this automatically when you run `npm run dev`.

4. **Deployed Worker:** add the same variable for production:

   ```sh
   npx wrangler secret put RESEND_API_KEY
   ```

   Paste the key when prompted. After changing secrets, run **`npm run deploy`** again if the Worker was already deployed.

### “API key is invalid” (Resend)

1. **Prove the key file is correct** (from `workers/send-ecard/`):

   ```sh
   npm run verify-resend
   ```

   If this fails, Resend is rejecting what is in **`.dev.vars`** — fix that file before testing the Worker or the Astro app.

2. **`.dev.vars` format** (one line, no spaces around `=`):

   ```bash
   RESEND_API_KEY=re_xxxxxxxxxxxxxxxx
   ```

   Do **not** put comments on the same line, do **not** wrap in `"quotes"` unless the value inside is exactly `re_...`, and do **not** prefix with `Bearer `.

3. **Local vs deployed:** `.dev.vars` only applies when you run **`npm run dev`** in this folder. The **deployed** `*.workers.dev` URL uses the **Cloudflare dashboard secret** (`wrangler secret put` or UI). If your Astro `.env` points at **production** but the secret was only in `.dev.vars`, production still has no/wrong key.

4. **New key:** In [Resend → API Keys](https://resend.com/api-keys), create a fresh key, update `.dev.vars` (and/or Cloudflare), restart `wrangler dev` / redeploy.

5. **`wrangler secret put` in zsh:** If the key contains `!`, history expansion can corrupt pasted text. Paste into a file and use `wrangler secret put RESEND_API_KEY < mykey.txt`, or run `set +o histexpand` first.

6. **From address:** For production, verify your domain in Resend and set `FROM_EMAIL` in the Cloudflare dashboard (Workers → your worker → Settings → Variables) to something like `Tussie Mussie <hello@yourdomain.com>`. For quick tests, the default `onboarding@resend.dev` in `wrangler.toml` works with Resend’s test domain.

7. **“You can only send testing emails to your own email address”:** Resend locks this when the `from` address is their test domain (`onboarding@resend.dev` etc.). The **`to`** recipient must be the same address you use to log into Resend, or delivery is rejected. To let visitors e-card **any** address: verify a domain at [resend.com/domains](https://resend.com/domains), complete DNS (SPF/DKIM), then set **`FROM_EMAIL`** on the Worker to a sender on that domain (e.g. `Tussie Mussie <bouquet@your-site.com>`).

8. **CORS:** Update `ALLOWED_ORIGINS` in `wrangler.toml` (or Cloudflare vars) to a comma-separated list of origins that may call the Worker (your Netlify URL and local dev, e.g. `http://localhost:4321`).

9. Deploy:

   ```sh
   npm run deploy
   ```

10. Copy the deployed Worker URL (e.g. `https://tussie-mussie-send-ecard.<your-subdomain>.workers.dev`) into the Astro app as `PUBLIC_ECARD_API_URL` in Netlify and local `.env`.

## Local dev

1. Add **`.dev.vars`** with `RESEND_API_KEY` (see step 3 above).  
2. Run:

   ```sh
   npm run dev
   ```

Use the printed URL (often `http://127.0.0.1:8787`) as `PUBLIC_ECARD_API_URL` in the Astro `.env`. The browser still sends **Origin: http://localhost:4321** (or whatever hosts the Astro app), so that value must appear in **`ALLOWED_ORIGINS`** — not the Worker’s `8787` URL.

## API

`POST` with `Content-Type: application/json`:

```json
{
  "to": "friend@example.com",
  "replyTo": "you@example.com",
  "personalMessage": "Optional note",
  "bouquetMeaning": "Meaning text",
  "imageUrl": "https://…"
}
```

`imageUrl` is optional but should be an `https` URL (e.g. from Cloudinary) when present.

## Test the Worker (with image, no app)

Use any **https** `imageUrl` hosted on **Cloudinary** (`res.cloudinary.com` or `*.cloudinary.com`). The Worker asks Resend to pull that URL as an **inline attachment** so the image shows in more inboxes than a hotlinked `<img>` alone.

```bash
# Replace WORKER_URL, recipient, reply-to, and a real Cloudinary https URL.
curl -sS -X POST "$WORKER_URL" \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:4321" \
  -d '{
    "to": "you@example.com",
    "replyTo": "you@example.com",
    "personalMessage": "Worker test with image",
    "bouquetMeaning": "Testing — fickleness (Abatina sample)",
    "imageUrl": "https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/f_auto,q_auto/flowers/abatina.jpg"
  }' | jq .
```

`Origin` must match one value in `ALLOWED_ORIGINS` or the Worker returns 403.
