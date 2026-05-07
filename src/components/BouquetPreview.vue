<template>
  <div
    class="romance-card rounded-2xl p-6 md:p-7 top-6 lg:sticky lg:top-24"
  >
    <p class="font-display italic text-brand-mauve/95 text-base mb-1">Your bouquet</p>
    <h2 class="font-display text-2xl md:text-3xl font-semibold text-brand-wine mb-1">
      Tussie mussie
    </h2>
    <OrnamentRule class="mb-5" />

    <!-- Notification -->
    <div
      v-if="notification.message"
      :class="[
        notificationClass,
        'fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl shadow-xl max-w-[min(90vw,24rem)] text-center text-sm border',
      ]"
    >
      {{ notification.message }}
    </div>

    <div v-if="totalFlowers > 0">

      <div class="mb-5">
        <h3 class="text-xs font-semibold uppercase tracking-[0.2em] text-brand-mauve/75 mb-3">
          In your arrangement · {{ totalFlowers }}
        </h3>
        <div class="space-y-2 max-h-60 overflow-y-auto pr-1">
          <div
            v-for="flower in selectedFlowers"
            :key="flower.id"
            class="flex items-center justify-between gap-2 bg-brand-blush/25 p-2.5 rounded-xl border border-brand-blush/45"
          >
            <div class="flex items-center min-w-0">
              <div class="w-9 h-9 rounded-full overflow-hidden mr-2.5 ring-2 ring-white shadow-sm shrink-0">
                <img
                  :src="`https://res.cloudinary.com/${cloudName}/image/upload/f_auto,q_auto/flowers/${flower.image}`"
                  :alt="flower.name"
                  class="w-full h-full object-cover"
                />
              </div>
              <span class="text-sm text-brand-forest/90 font-medium truncate">{{ flower.name }}</span>
            </div>
            <button
              type="button"
              @click="onRemoveFlower(flower.id)"
              class="shrink-0 text-brand-blossom hover:text-brand-wine text-xs font-medium px-2 py-1 rounded-lg hover:bg-brand-blush/35 transition-colors"
              aria-label="Remove from bouquet"
            >
              Remove
            </button>
          </div>
        </div>
      </div>

      <div class="mb-6">
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-sm font-medium text-brand-forest/80">The message in your flowers</h3>
          <button
            type="button"
            @click="showMeanings = !showMeanings"
            class="text-sm text-brand-mauve hover:text-brand-wine underline decoration-brand-blossom/50 underline-offset-2"
          >
            {{ showMeanings ? "Hide" : "Reveal" }}
          </button>
        </div>
        <div
          v-if="showMeanings"
          class="bg-gradient-to-br from-brand-sky/25 to-brand-blush/30 p-4 rounded-xl text-sm text-brand-forest/82 leading-relaxed border border-brand-sky/35 italic"
        >
          {{ combinedMeaning }}
        </div>
      </div>

      <div v-if="!imageUrl" class="flex gap-2 mb-4">
        <button
          type="button"
          @click="onClearBouquet"
          class="flex-1 py-2.5 px-4 rounded-xl bg-brand-blush/20 text-brand-forest/85 hover:bg-brand-blush/35 border border-brand-blush/40 transition-colors text-sm font-medium"
        >
          Begin again
        </button>
        <button
          type="button"
          @click="handleGenerateImage"
          :disabled="isGenerating"
          class="flex-1 py-2.5 px-4 text-white rounded-xl transition-all text-sm font-medium border border-brand-wine/25"
          :class="{
            'bg-brand-blush/40 text-brand-forest/45 cursor-not-allowed border-transparent': isGenerating,
            'bg-gradient-to-br from-brand-wine to-brand-mauve hover:shadow-lg shadow-md shadow-brand-wine/20':
              !isGenerating,
          }"
        >
          {{ isGenerating ? "Composing your bouquet…" : "Compose my bouquet" }}
        </button>
      </div>

      <div v-else class="mb-6">
        <div
          class="rounded-xl overflow-hidden mb-4 ring-1 ring-brand-blush/50 shadow-inner bg-brand-blush/15"
        >
          <img
            :src="imageUrl"
            alt="your tussie mussie"
            class="w-full h-auto"
          />
        </div>
        <div class="flex gap-2">
          <button
            type="button"
            @click="resetImage"
            class="flex-1 py-2.5 px-4 rounded-xl bg-brand-blush/20 text-brand-forest/85 hover:bg-brand-blush/35 border border-brand-blush/40 transition-colors text-sm font-medium"
          >
            Change image
          </button>
          <button
            type="button"
            @click="downloadImage"
            class="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-br from-brand-wine to-brand-mauve text-white hover:shadow-lg shadow-md shadow-brand-wine/18 text-sm font-medium border border-brand-wine/30 transition-all"
          >
            Download
          </button>
        </div>

        <div
          v-if="ecardApiUrl"
          class="mt-6 p-5 rounded-2xl bg-gradient-to-b from-brand-blush/25 to-brand-sky/20 border border-brand-blush/45"
        >
          <h3 class="font-display text-lg font-semibold text-brand-wine mb-1">
            Send love by postscript
          </h3>
          <p class="text-sm text-brand-forest/72 mb-4 leading-relaxed">
            We’ll deliver your blossoms and their meaning—with your note—to someone dear. They can reply gently to your email.
          </p>
          <div class="flex flex-col gap-3">
            <div>
              <label class="block text-xs font-medium uppercase tracking-wide text-brand-forest/65 mb-1.5"
                >A few tender words</label
              >
              <textarea
                v-model="personalMessage"
                class="w-full px-3 py-2.5 border border-brand-blush/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blossom/30 bg-white/92 text-sm text-brand-forest/90 placeholder:text-brand-forest/40"
                rows="3"
                placeholder="From my heart…"
              ></textarea>
            </div>
            <div>
              <label class="block text-xs font-medium uppercase tracking-wide text-brand-forest/65 mb-1.5"
                >Your email (for replies)</label
              >
              <input
                type="email"
                v-model="senderEmail"
                class="w-full px-3 py-2.5 border border-brand-blush/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blossom/30 bg-white/92 text-sm"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label class="block text-xs font-medium uppercase tracking-wide text-brand-forest/65 mb-1.5"
                >Their email</label
              >
              <input
                type="email"
                v-model="recipientEmail"
                class="w-full px-3 py-2.5 border border-brand-blush/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blossom/30 bg-white/92 text-sm"
                placeholder="their@example.com"
              />
            </div>
            <button
              type="button"
              @click="sendEcard"
              :disabled="isSending"
              class="w-full py-3 px-4 rounded-xl bg-gradient-to-br from-brand-wine to-brand-mauve text-white hover:shadow-xl transition-all disabled:opacity-55 disabled:cursor-not-allowed text-sm font-semibold shadow-lg shadow-brand-wine/25 border border-brand-wine/35"
            >
              {{ isSending ? "Sealing envelope…" : "Seal & send e-card" }}
            </button>
          </div>
        </div>
      </div>

    </div>

    <div v-else class="text-center py-14 px-2">
      <p class="font-display text-xl text-brand-mauve/95 italic mb-2">Your ribbon waits</p>
      <p class="text-sm text-brand-forest/65 leading-relaxed max-w-[14rem] mx-auto">
        Choose blossoms from the garden—your private nosegay will gather here.
      </p>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch } from "vue";
import { PUBLIC_ECARD_API_URL } from "astro:env/client";
import { generateBouquetImage } from "../services/imageGenerator";
import { uploadToCloudinary } from "../utils/cloudinary";
import OrnamentRule from "./ui/OrnamentRule.vue";

export default {
  name: "BouquetPreview",
  components: { OrnamentRule },
  props: {
    selectedFlowers: {
      type: Array,
      required: true,
    },
    onRemoveFlower: {
      type: Function,
      required: true,
    },
    onClearBouquet: {
      type: Function,
      required: true,
    },
  },
  setup(props) {
    const showMeanings = ref(true);
    const imageUrl = ref(null);
    const isGenerating = ref(false);
    const isSending = ref(false);
    const personalMessage = ref("");
    const senderEmail = ref("");
    const recipientEmail = ref("");

    const ecardApiUrl =
      typeof PUBLIC_ECARD_API_URL === "string" && PUBLIC_ECARD_API_URL.trim().length > 0
        ? PUBLIC_ECARD_API_URL.trim()
        : "";

    const notification = ref({ message: "", type: "" });
    let notificationDismissTimer = /** @type {ReturnType<typeof setTimeout> | null} */ (null);
    const TOAST_MS = 8800;

    const totalFlowers = computed(() => props.selectedFlowers.length);
    const combinedMeaning = computed(() =>
      props.selectedFlowers.map((f) => f.meaning).join(". ")
    );

    const cloudName = import.meta.env.PUBLIC_CLOUDINARY_CLOUD_NAME;

    watch(
      () => props.selectedFlowers,
      () => {
        imageUrl.value = null;
        personalMessage.value = "";
        senderEmail.value = "";
        recipientEmail.value = "";
      }
    );

    const handleGenerateImage = async () => {
      if (props.selectedFlowers.length === 0) return;

      try {
        isGenerating.value = true;
        const flowerNames = props.selectedFlowers.map((flower) => flower.name);
        const generatedImageUrl = await generateBouquetImage(flowerNames);
        imageUrl.value = generatedImageUrl;
      } catch (error) {
        console.error("Error generating image:", error);
        const msg =
          error instanceof Error ? error.message : "Failed to generate image.";
        showNotification(msg, "error");
      } finally {
        isGenerating.value = false;
      }
    };

    const showNotification = (message, type) => {
      if (notificationDismissTimer) {
        clearTimeout(notificationDismissTimer);
        notificationDismissTimer = null;
      }
      notification.value = { message, type };
      notificationDismissTimer = setTimeout(() => {
        notification.value = { message: "", type: "" };
        notificationDismissTimer = null;
      }, TOAST_MS);
    };

    const notificationClass = computed(() => {
      return notification.value.type === "success"
        ? "bg-brand-sky/25 text-brand-forest border-brand-sky/45"
        : "bg-brand-blush/30 text-brand-wine border-brand-blush/55";
    });

    /** Split data:image/...;base64,... reliably (MIME params, ";base64" case). */
    const splitDataUrl = (dataUrl) => {
      const s = String(dataUrl ?? "").trim();
      if (!s.startsWith("data:")) return null;
      const comma = s.indexOf(",");
      if (comma === -1) return null;
      const header = s.slice(5, comma);
      const data = s.slice(comma + 1).replace(/\s/g, "");
      const hdr = header.toLowerCase();
      const i = hdr.indexOf(";base64");
      if (i === -1) return null;
      const mime = header.slice(0, i).split(";")[0].trim() || "image/png";
      return mime && data ? { mime, base64: data } : null;
    };

    const downloadImage = () => {
      if (imageUrl.value) {
        const link = document.createElement("a");
        link.href = imageUrl.value;
        link.download = `tussie-mussie.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    };

    const resetImage = () => {
      imageUrl.value = null;
      personalMessage.value = "";
      senderEmail.value = "";
      recipientEmail.value = "";
    };

    const sendEcard = async () => {
      if (!ecardApiUrl) return;
      if (!recipientEmail.value.trim()) {
        showNotification("Please enter the recipient’s email.", "error");
        return;
      }
      if (!senderEmail.value.trim()) {
        showNotification("Please enter your email (for replies).", "error");
        return;
      }

      isSending.value = true;
      try {
        let hostedImageUrl = "";
        let imageBase64Payload = "";
        let imageMimeTypePayload = "";

        if (imageUrl.value) {
          const raw = String(imageUrl.value).trim();
          if (raw.startsWith("https://")) {
            hostedImageUrl = raw;
          } else {
            const parts = splitDataUrl(raw);
            if (parts) {
              /* Host on Cloudinary first: Resend inlines CID from remote path more reliably than huge JSON base64. */
              try {
                hostedImageUrl = await uploadToCloudinary(raw);
              } catch (e) {
                console.warn("Cloudinary hosting for e-card failed, falling back to inline attach:", e);
                imageMimeTypePayload = parts.mime;
                imageBase64Payload = parts.base64;
              }
            } else if (raw.startsWith("data:")) {
              showNotification("Could not read bouquet image for email.", "error");
              isSending.value = false;
              return;
            } else {
              try {
                hostedImageUrl = await uploadToCloudinary(raw);
              } catch (e) {
                console.error("Cloudinary upload failed:", e);
                showNotification(
                  "Could not upload the image. Try again or send without image.",
                  "error"
                );
                isSending.value = false;
                return;
              }
            }
          }
        }

        const res = await fetch(ecardApiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: recipientEmail.value.trim(),
            replyTo: senderEmail.value.trim(),
            personalMessage: personalMessage.value,
            bouquetMeaning: combinedMeaning.value,
            ...(hostedImageUrl ? { imageUrl: hostedImageUrl } : {}),
            ...(imageBase64Payload
              ? { imageBase64: imageBase64Payload, imageMimeType: imageMimeTypePayload }
              : {}),
          }),
        });

        let data;
        try {
          data = await res.json();
        } catch {
          showNotification("Unexpected response from e-card service.", "error");
          return;
        }

        if (!res.ok || !data?.ok) {
          showNotification(data?.error || "Failed to send e-card.", "error");
          return;
        }

        showNotification("E-card sent!", "success");
        personalMessage.value = "";
        recipientEmail.value = "";
      } catch (e) {
        console.error(e);
        showNotification("Network error sending e-card.", "error");
      } finally {
        isSending.value = false;
      }
    };

    return {
      showMeanings,
      imageUrl,
      isGenerating,
      isSending,
      totalFlowers,
      combinedMeaning,
      handleGenerateImage,
      notification,
      notificationClass,
      downloadImage,
      resetImage,
      cloudName,
      ecardApiUrl,
      personalMessage,
      senderEmail,
      recipientEmail,
      sendEcard,
    };
  },
};
</script>