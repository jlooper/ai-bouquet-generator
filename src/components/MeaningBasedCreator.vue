<template>
  <div>
    <h2 class="font-display text-2xl md:text-3xl font-semibold text-brand-wine mb-2">
      Bouquet by feeling
    </h2>
    <p class="text-brand-forest/72 mb-6 text-sm leading-relaxed font-light">
      Name the longing in your breast—love, solace, gratitude—and we’ll gather stems whose old language speaks it for you.
    </p>

    <div class="mb-6">
      <label class="block text-xs font-semibold uppercase tracking-wide text-brand-forest/65 mb-2">
        A mood to begin from (optional)
      </label>
      <select
        class="w-full px-4 py-2.5 border border-brand-blush/65 rounded-xl bg-white/85 text-brand-forest/88 focus:outline-none focus:ring-2 focus:ring-brand-blossom/30"
        v-model="selectedSentiment"
        @change="updateCustomMeaning"
      >
        <option value="">Choose a tender theme</option>
        <option
          v-for="(keywords, sentiment) in sentimentKeywords"
          :key="sentiment"
          :value="sentiment"
        >
          {{ capitalize(sentiment) }}
        </option>
      </select>
    </div>

    <div class="mb-6">
      <label class="block text-xs font-semibold uppercase tracking-wide text-brand-forest/65 mb-2">
        Or write your own spell in words
      </label>
      <textarea
        class="w-full px-4 py-3 border border-brand-blush/65 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blossom/30 min-h-[110px] bg-white/85 text-brand-forest/88 placeholder:text-brand-forest/40"
        placeholder="forgiveness, a second chance, quiet hope…"
        v-model="customMeaning"
        @input="clearSelectedSentiment"
      />
    </div>

    <div
      v-if="error"
      class="mb-4 p-3 bg-brand-blush/25 text-brand-wine text-sm rounded-xl border border-brand-blush/50"
    >
      {{ error }}
    </div>

    <button
      type="button"
      @click="findMatchingFlowers"
      :disabled="isLoading || isGenerating"
      class="w-full py-3.5 px-4 rounded-xl bg-gradient-to-br from-brand-wine to-brand-mauve text-white hover:shadow-lg transition-all duration-200 disabled:opacity-45 disabled:cursor-not-allowed font-medium shadow-lg shadow-brand-wine/20 border border-brand-wine/30"
    >
      <span v-if="isGenerating" class="flex items-center justify-center">
        <svg
          class="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          ></circle>
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
        Arranging your nosegay…
      </span>
      <span v-else>Arrange my bouquet</span>
    </button>


  </div>
</template>

<script>
import { ref, reactive, watch } from "vue";

export default {
  name: "MeaningBasedCreator",
  props: {
    flowers: {
      type: Array,
      required: true,
    },
    onCreateBouquet: {
      type: Function,
      required: true,
    },
    isLoading: {
      type: Boolean,
      required: true,
    },
  },
  setup(props) {
    const customMeaning = ref("");
    const selectedSentiment = ref("");
    const matchedFlowers = ref([]);
    const isGenerating = ref(false);
    const error = ref("");
    const cloudName = import.meta.env.PUBLIC_CLOUDINARY_CLOUD_NAME;

    const sentimentKeywords = reactive({
      love: ["love", "passion", "affection", "adoration", "heart"],
      friendship: ["friendship", "joy", "loyalty", "bond"],
      sympathy: ["sympathy", "consolation", "remembrance", "grief"],
      congratulations: ["success", "prosperity", "honor", "achievement"],
      apology: ["forgiveness", "regret", "sorry", "pity", "compassion"],
      gratitude: ["gratitude", "thankful", "appreciation", "thanks"],
      encouragement: ["strength", "faith", "hope", "wisdom", "courage"],
      celebration: ["joy", "happiness", "excitement", "festivity"],
    });

    const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);

    const updateCustomMeaning = () => {
      if (selectedSentiment.value && sentimentKeywords[selectedSentiment.value]) {
        customMeaning.value = sentimentKeywords[selectedSentiment.value].join(", ");
      }
    };

    const clearSelectedSentiment = () => {
      selectedSentiment.value = "";
    };

    const findMatchingFlowers = () => {
      if (!customMeaning.value.trim()) {
        error.value = "Please enter a meaning or select a sentiment";
        return;
      }

      error.value = "";
      isGenerating.value = true;

      const keywords = customMeaning.value
        .toLowerCase()
        .split(/[,.\s]+/)
        .filter((word) => word.length > 3);

      const matches = [];
      const usedIds = new Set();

      keywords.forEach((keyword) => {
        props.flowers.forEach((flower) => {
          if (
            !usedIds.has(flower.id) &&
            flower.meaning.toLowerCase().includes(keyword)
          ) {
            matches.push(flower);
            usedIds.add(flower.id);
          }
        });
      });

      if (matches.length < 3) {
        props.flowers.forEach((flower) => {
          if (!usedIds.has(flower.id) && matches.length < 5) {
            matches.push(flower);
            usedIds.add(flower.id);
          }
        });
      }

      const finalSelection = matches.slice(0, 5);

      setTimeout(() => {
        matchedFlowers.value = finalSelection;
        props.onCreateBouquet(finalSelection);
        isGenerating.value = false;
      }, 1000);
    };

    return {
      customMeaning,
      selectedSentiment,
      matchedFlowers,
      isGenerating,
      error,
      sentimentKeywords,
      capitalize,
      updateCustomMeaning,
      clearSelectedSentiment,
      findMatchingFlowers,
      cloudName,
    };
  },
};
</script>

