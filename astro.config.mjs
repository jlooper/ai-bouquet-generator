import { defineConfig, envField } from 'astro/config';
import vue from '@astrojs/vue';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [vue()],
  env: {
    schema: {
      GEMINI_API_KEY: envField.string({
        context: "client",
        access: "public",
        optional: true,
      }),
      CLOUDINARY_PRESET: envField.string({ context: "client", access: "public" }),
      PUBLIC_CLOUDINARY_CLOUD_NAME: envField.string({ context: "client", access: "public" }),
      /** Cloudflare Worker URL that sends e-cards via Resend (see workers/send-ecard/) */
      PUBLIC_ECARD_API_URL: envField.string({ context: "client", access: "public", optional: true }),
    }
  }
});


