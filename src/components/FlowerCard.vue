<template>
  <div
    class="group rounded-2xl overflow-hidden romance-card hover:shadow-lg hover:border-brand-blossom/40 transition-all duration-300 hover:-translate-y-0.5"
  >
    <div class="h-44 overflow-hidden relative">
      <div
        class="absolute inset-0 bg-gradient-to-t from-brand-wine/25 via-transparent to-transparent opacity-55 pointer-events-none z-10"
        aria-hidden="true"
      ></div>
      <img
        :src="`https://res.cloudinary.com/${cloudName}/image/upload/w_280/f_auto,q_auto:eco/flowers/${flower.image}`"
        :alt="flower.name"
        class="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
      />
    </div>
    <div class="p-4 pt-3">
      <h3 class="font-display text-lg font-semibold text-brand-wine tracking-tight">
        {{ flower.name }}
      </h3>
      <p class="text-brand-forest/70 text-sm mb-4 leading-snug italic mt-1">
        {{ flower.meaning }}
      </p>
      <button
        type="button"
        @click="onAddToBouquet"
        :disabled="isInBouquet"
        class="w-full py-2.5 px-4 rounded-xl text-sm font-medium transition-all duration-200"
        :class="{
          'bg-brand-blush/35 text-brand-blush cursor-not-allowed border border-brand-blush/50':
            isInBouquet,
          'bg-gradient-to-br from-brand-wine to-brand-mauve text-white hover:shadow-lg shadow-md shadow-brand-wine/20 border border-brand-wine/35':
            !isInBouquet,
        }"
      >
        {{
          isInBouquet ? "Added to bouquet" : "Tuck into your bouquet"
        }}
      </button>
    </div>
  </div>
</template>

<script setup>

const props = defineProps({
  flower: {
    type: Object,
    required: true,
  },
  onAddToBouquet: {
    type: Function,
    required: true,
  },
  isInBouquet: {
    type: Boolean,
    required: true,
  },
});

const cloudName = import.meta.env.PUBLIC_CLOUDINARY_CLOUD_NAME;
</script>