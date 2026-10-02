<script setup>
import { ref } from 'vue'

const props = defineProps({
  playerName: { type: String, required: true },
  roleName: { type: String, default: '???' },
  roleIcon: { type: String, default: '❓' },
  roleDescription: { type: String, default: 'Rôle inconnu' }
})

const isFlipped = ref(false)

const toggleFlip = () => {
  isFlipped.value = !isFlipped.value
}
</script>

<template>
  <!-- Mobile first : w-[260px] h-[380px] au centre, puis plus grand sur tablette/PC (sm:) -->
  <div class="card-container mx-auto w-[260px] h-[380px] sm:w-[300px] sm:h-[420px]" @click="toggleFlip">
    
    <div :class="['card-inner', { 'is-flipped': isFlipped }]">
      
      <!-- Face Avant : Dos de la carte -->
      <div class="card-face card-front bg-gray-800 border-4 border-gray-600 shadow-2xl">
        <div class="flex flex-col items-center justify-between h-full p-6 text-center">
          <div class="text-sm font-mono text-gray-400">#JOUEUR</div>
          <div>
            <div class="text-6xl mb-4">👤</div>
            <h3 class="text-2xl font-bold text-white">{{ playerName }}</h3>
          </div>
          <span class="bg-gray-700 px-4 py-2 rounded-full text-sm font-medium text-white hover:bg-gray-600">
            Retourner
          </span>
        </div>
      </div>

      <!-- Face Arrière : Rôle Révélé -->
      <div class="card-face card-back bg-indigo-950 border-4 border-indigo-700 shadow-2xl">
        <div class="flex flex-col items-center justify-between h-full p-6 text-center">
          <div class="text-sm font-mono text-indigo-300">#RÔLE</div>
          <div>
            <div class="text-7xl mb-4 drop-shadow-md">{{ roleIcon }}</div>
            <h2 class="text-3xl font-extrabold text-yellow-400 tracking-tight">{{ roleName }}</h2>
            <p class="text-base text-gray-200 mt-4 leading-relaxed">{{ roleDescription }}</p>
          </div>
          <span class="text-indigo-400 text-xs font-semibold uppercase tracking-widest">Secret</span>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.card-container {
  /* On retire width et height d'ici, Tailwind gère les tailles dans le template */
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
  
  /* Correction anti-superposition */
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