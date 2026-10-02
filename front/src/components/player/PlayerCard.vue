<script setup>
import { computed, ref } from "vue";
import { roleIcon, teamLabel } from "../../roleMeta";

const props = defineProps({
  role: { type: Object, default: null },
  playerName: { type: String, default: "" },
});

const flipped = ref(false);
const isWolf = computed(() => props.role?.team === "werewolves");
</script>

<template>
  <!-- Mobile first : petit sur téléphone, plus grand dès sm -->
  <div
    class="card-container mx-auto w-[260px] h-[380px] sm:w-[300px] sm:h-[420px]"
    @click="flipped = !flipped"
  >
    <div class="card-inner" :class="{ 'is-flipped': flipped }">
      <!-- Face avant : dos de la carte -->
      <div class="card-face card-front bg-gray-800 border-4 border-gray-600 shadow-2xl">
        <div class="flex flex-col items-center justify-between h-full p-6 text-center">
          <div class="text-sm font-mono text-gray-400">#JOUEUR</div>
          <div>
            <div class="text-6xl mb-4">👤</div>
            <h3 class="text-2xl font-bold text-white">{{ playerName || "Joueur" }}</h3>
          </div>
          <span class="bg-gray-700 px-4 py-2 rounded-full text-sm font-medium text-white">
            Retourner
          </span>
        </div>
      </div>

      <!-- Face arrière : rôle révélé -->
      <div
        class="card-face card-back border-4 shadow-2xl"
        :class="isWolf ? 'bg-red-950 border-red-700' : 'bg-indigo-950 border-indigo-700'"
      >
        <div class="flex flex-col items-center justify-between h-full p-6 text-center">
          <div
            class="text-sm font-mono"
            :class="isWolf ? 'text-red-300' : 'text-indigo-300'"
          >
            #RÔLE
          </div>
          <div v-if="role">
            <div class="text-7xl mb-4 drop-shadow-md">{{ roleIcon(role.id) }}</div>
            <h2 class="text-3xl font-extrabold text-yellow-400 tracking-tight">{{ role.name }}</h2>
            <p class="text-xs uppercase tracking-widest text-gray-300 mt-2">
              {{ teamLabel(role.team) }}
            </p>
            <p class="text-base text-gray-200 mt-4 leading-relaxed">{{ role.description }}</p>
          </div>
          <div v-else class="text-gray-400 italic">En attente du Maître du Jeu…</div>
          <span
            class="text-xs font-semibold uppercase tracking-widest"
            :class="isWolf ? 'text-red-400' : 'text-indigo-400'"
          >
            Secret
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card-container {
  perspective: 1200px;
  cursor: pointer;
}
.card-inner {
  width: 100%;
  height: 100%;
  position: relative;
  transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  transform-style: preserve-3d;
}
.card-inner.is-flipped {
  transform: rotateY(180deg);
}
.card-face {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border-radius: 1.5rem;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  transform: translateZ(0);
}
.card-front {
  transform: rotateY(0deg);
}
.card-back {
  transform: rotateY(180deg);
}
</style>
