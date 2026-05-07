<template>
  <div class="flex flex-col lg:flex-row gap-8 lg:gap-10 items-start">
    <div class="lg:w-2/3 w-full">
      <div class="romance-card rounded-2xl p-6 md:p-8 mb-6">
        <div
          class="flex gap-1 p-1 mb-8 rounded-xl bg-brand-wine/5 border border-brand-blush/45 w-full sm:w-fit"
          role="tablist"
        >
          <button
            type="button"
            role="tab"
            class="flex-1 sm:flex-none py-2.5 px-5 rounded-lg text-sm font-medium transition-all duration-300"
            :class="{
              'bg-white text-brand-wine shadow-sm ring-1 ring-brand-blush/50': activeTab === 'manual',
              'text-brand-forest/50 hover:text-brand-wine/90': activeTab !== 'manual',
            }"
            @click="activeTab = 'manual'"
          >
            Choose stems
          </button>
          <button
            type="button"
            role="tab"
            class="flex-1 sm:flex-none py-2.5 px-5 rounded-lg text-sm font-medium transition-all duration-300"
            :class="{
              'bg-white text-brand-wine shadow-sm ring-1 ring-brand-blush/50': activeTab === 'meaning',
              'text-brand-forest/50 hover:text-brand-wine/90': activeTab !== 'meaning',
            }"
            @click="activeTab = 'meaning'"
          >
            By heartfelt meaning
          </button>
        </div>

        <div v-if="activeTab === 'manual'">
          <h2 class="font-display text-2xl md:text-3xl font-semibold text-brand-wine mb-2">
            Choose each bloom
          </h2>
          <p class="text-brand-forest/70 text-sm mb-6 font-light">
            Wander the garden of meanings—search by flower or by the feeling you wish to name.
          </p>

          <div class="flex flex-col sm:flex-row gap-4 mb-6">
            <div class="flex-1">
              <input
                type="text"
                :placeholder="`Search by ${filterBy}…`"
                class="w-full px-4 py-2.5 rounded-xl border border-brand-blush/65 bg-white/85 text-brand-forest/85 placeholder:text-brand-forest/45 focus:outline-none focus:ring-2 focus:ring-brand-blossom/35 focus:border-brand-blush transition-shadow"
                v-model="searchTerm"
              />
            </div>
            <div class="sm:w-52">
              <select
                class="w-full px-4 py-2.5 rounded-xl border border-brand-blush/65 bg-white/85 text-brand-forest/85 focus:outline-none focus:ring-2 focus:ring-brand-blossom/35 focus:border-brand-blush"
                v-model="filterBy"
              >
                <option value="name">By flower name</option>
                <option value="meaning">By symbolism</option>
              </select>
            </div>
          </div>

          <div v-if="isLoading" class="flex justify-center items-center h-64">
            <div
              class="animate-spin rounded-full h-11 w-11 border-2 border-brand-blush border-t-brand-wine"
              aria-hidden="true"
            ></div>
          </div>
          <div v-else>
            <div class="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              <FlowerCard
                v-for="flower in paginatedFlowers"
                :key="flower.id"
                :flower="flower"
                :onAddToBouquet="() => addFlowerToBouquet(flower)"
                :isInBouquet="selectedFlowers.some(f => f.id === flower.id)"
              />
            </div>
            
            <!-- Pagination Controls -->
            <div class="flex justify-center items-center gap-3 mt-6 flex-wrap">
              <button
                type="button"
                @click="currentPage--"
                :disabled="currentPage === 1"
                class="px-4 py-2 rounded-full text-sm font-medium transition-all duration-200"
                :class="{
                  'bg-brand-blush/25 text-brand-forest/35 cursor-not-allowed': currentPage === 1,
                  'bg-brand-wine text-white hover:bg-brand-mauve shadow-md shadow-brand-wine/20': currentPage > 1,
                }"
              >
                Previous
              </button>

              <span class="text-sm text-brand-forest/55 tabular-nums">
                Page {{ currentPage }} of {{ totalPages }}
              </span>

              <button
                type="button"
                @click="currentPage++"
                :disabled="currentPage === totalPages"
                class="px-4 py-2 rounded-full text-sm font-medium transition-all duration-200"
                :class="{
                  'bg-brand-blush/25 text-brand-forest/35 cursor-not-allowed':
                    currentPage === totalPages,
                  'bg-brand-wine text-white hover:bg-brand-mauve shadow-md shadow-brand-wine/20':
                    currentPage < totalPages,
                }"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        <div v-else>
          <MeaningBasedCreator
            :flowers="flowers"
            :onCreateBouquet="setFlowersByMeaning"
            :isLoading="isLoading"
          />
        </div>
      </div>
    </div>

    <div class="lg:w-1/3">
      <BouquetPreview
        :selectedFlowers="selectedFlowers"
        :onRemoveFlower="removeFlowerFromBouquet"
        :onClearBouquet="clearBouquet"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import FlowerCard from "./FlowerCard.vue";
import BouquetPreview from "./BouquetPreview.vue";
import MeaningBasedCreator from "./MeaningBasedCreator.vue";

const flowers = ref([]);
const selectedFlowers = ref([]);
const searchTerm = ref("");
const filterBy = ref("name");
const isLoading = ref(true);
const activeTab = ref("manual");
const currentPage = ref(1);
const flowersPerPage = 6;

const fetchFlowers = async () => {
  try {
    const response = await fetch("/flowers.json");
    if (!response.ok) {
      throw new Error("Failed to fetch flowers data");
    }
    const data = await response.json();
    flowers.value = data;
  } catch (error) {
    console.error("Error fetching flowers:", error);
  } finally {
    isLoading.value = false;
  }
};

onMounted(fetchFlowers);

// Reset to first page when search term or filter changes
watch([searchTerm, filterBy], () => {
  currentPage.value = 1;
});

const filteredFlowers = computed(() => {
  return flowers.value.filter((flower) => {
    if (filterBy.value === "name") {
      return flower.name
        .toLowerCase()
        .includes(searchTerm.value.toLowerCase());
    } else {
      return flower.meaning
        .toLowerCase()
        .includes(searchTerm.value.toLowerCase());
    }
  });
});

const totalPages = computed(() => {
  return Math.ceil(filteredFlowers.value.length / flowersPerPage);
});

const paginatedFlowers = computed(() => {
  const start = (currentPage.value - 1) * flowersPerPage;
  const end = start + flowersPerPage;
  return filteredFlowers.value.slice(start, end);
});

const addFlowerToBouquet = (flower) => {
  selectedFlowers.value.push(flower);
};

const removeFlowerFromBouquet = (flowerId) => {
  selectedFlowers.value = selectedFlowers.value.filter(
    (flower) => flower.id !== flowerId
  );
};

const clearBouquet = () => {
  selectedFlowers.value = [];
};

const setFlowersByMeaning = (newFlowers) => {
  selectedFlowers.value = newFlowers;
};
</script>