<script setup>
import { useGameStore } from '../stores/gameStore'

const props = defineProps({
  player: Object
})

const gameStore = useGameStore()
</script>

<template>
  <!-- Conteneur global de la cellule du joueur dans la grille -->
  <div class="flex flex-col items-center w-full max-w-[260px] mx-auto">
    
    <!-- 1. La Carte 3D (Design identique au joueur) -->
    <div class="card-container w-full h-[280px] sm:h-[340px] mb-4" @click="player.isRevealed = !player.isRevealed">
      <div :class="['card-inner', { 'is-flipped': player.isRevealed }]">
        
        <!-- Face Avant : Dos de la carte (Identité) -->
        <div class="card-face card-front shadow-2xl border-4" 
             :class="player.isAlive ? 'bg-gray-800 border-gray-600' : 'bg-red-950 border-red-900 grayscale opacity-80'">
          <div class="flex flex-col items-center justify-between h-full p-5 text-center relative">
            
            <!-- Badge Micro statique sur la carte -->
            <div class="absolute top-3 right-3 text-lg" v-if="player.isMuted">🔇</div>
            
            <div class="text-xs font-mono text-gray-400">#JOUEUR</div>
            <div>
              <div class="text-5xl mb-3">👤</div>
              <h3 class="text-xl font-bold text-white" :class="{'line-through text-red-500': !player.isAlive}">
                {{ player.name }}
              </h3>
            </div>
            <span class="bg-gray-700 px-4 py-1.5 rounded-full text-xs font-medium text-white hover:bg-gray-600">
              Voir Rôle
            </span>
          </div>
        </div>

        <!-- Face Arrière : Rôle Révélé -->
        <div class="card-face card-back shadow-2xl border-4" 
             :class="player.role === 'Loup-Garou' ? 'bg-red-900 border-red-700' : 'bg-indigo-950 border-indigo-700'">
          <div class="flex flex-col items-center justify-between h-full p-5 text-center">
            <div class="text-xs font-mono" :class="player.role === 'Loup-Garou' ? 'text-red-300' : 'text-indigo-300'">#RÔLE</div>
            <div>
              <div class="text-6xl mb-3 drop-shadow-md">{{ player.role === 'Loup-Garou' ? '🐺' : '🧪' }}</div>
              <h2 class="text-2xl font-extrabold text-yellow-400 tracking-tight">{{ player.role }}</h2>
              <p class="text-xs text-gray-200 mt-3 leading-relaxed px-2">
                {{ player.role === 'Loup-Garou' ? 'Se réveille la nuit pour éliminer une cible.' : 'Possède une potion de vie et une de mort.' }}
              </p>
            </div>
            <span class="text-gray-300 text-xs font-semibold uppercase tracking-widest">Cacher</span>
          </div>
        </div>

      </div>
    </div>

    <!-- 2. Les Boutons d'Action du MJ (Sous la carte) -->
    <div class="flex w-full gap-2">
      <!-- Bouton Mute -->
      <button 
        @click="gameStore.toggleMutePlayer(player.id)"
        :class="player.isMuted ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700'"
        class="flex-1 py-2.5 rounded-xl border font-medium text-sm transition-colors flex items-center justify-center gap-2">
        {{ player.isMuted ? '🔇 Muté' : '🎙️ Actif' }}
      </button>

      <!-- Bouton Tuer / Ressusciter -->
      <button 
        v-if="player.isAlive"
        @click="gameStore.killPlayer(player.id)"
        class="flex-[1.5] bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-600/30 py-2.5 rounded-xl font-bold text-sm transition-colors">
        💀 Éliminer
      </button>
      
      <button 
        v-else 
        @click="player.isAlive = true"
        class="flex-[1.5] bg-green-600/20 hover:bg-green-600/40 text-green-400 border border-green-600/30 py-2.5 rounded-xl font-bold text-sm transition-colors">
        ❤️️ Raviver
      </button>
    </div>

  </div>
</template>

<style scoped>
/* La hauteur est gérée par Tailwind dans le HTML, on garde juste la perspective ici */
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
  
  /* Essentiel pour éviter la superposition des textes */
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