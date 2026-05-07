<template>
  <div class="min-h-screen romance-page-bg py-8">
    <div class="container mx-auto px-4">
      <header class="text-center mb-12 max-w-2xl mx-auto">
        <p class="font-display italic text-brand-mauve/90 text-lg mb-2">A whisper in petals</p>
        <h1 class="font-display text-4xl md:text-5xl font-semibold text-brand-wine mb-4">
          Compose your tussie mussie
        </h1>
        <p class="text-brand-forest/75 text-lg leading-relaxed font-light">
          Gather blooms by intent—Victorian floriography, made gentle for today.
        </p>
      </header>

      <FlowerBouquetCreator />
    </div>
  </div>
</template>

<script>
import FlowerBouquetCreator from "./components/FlowerBouquetCreator.vue";

export default {
  name: "App",
  components: {
    FlowerBouquetCreator,
  },
};
</script>
