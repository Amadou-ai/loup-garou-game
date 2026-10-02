<script setup>
import { useGameStore } from '../stores/gameStore'
import PlayerCardGM from './PlayerCardGM.vue'

const gameStore = useGameStore()
</script>

<template>
  <div class="p-6">
    
<!-- Barre de Contrôle Globale -->
    <header class="flex flex-wrap justify-between items-center bg-gray-800/80 backdrop-blur p-4 rounded-2xl mb-8 shadow-xl border border-gray-700/50">
      <div class="flex gap-4">
        <button 
          @click="gameStore.toggleNight()" 
          :class="gameStore.isNight ? 'bg-yellow-500 text-gray-900 shadow-[0_0_15px_rgba(234,179,8,0.4)]' : 'bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.4)]'"
          class="px-6 py-3 font-bold rounded-xl transition-all duration-300 transform hover:scale-105">
          {{ gameStore.isNight ? '☀️️ Réveiller le village' : '🌙 Endormir le village' }}
        </button>
        
        <!-- 👈 Le nouveau bouton dynamique -->
        <button 
          @click="gameStore.toggleMuteAll()"
          :class="gameStore.isAllMuted ? 'bg-red-900/80 border-red-700 text-red-200' : 'bg-red-600 hover:bg-red-500 border-red-500 text-white shadow-lg'"
          class="px-6 py-3 font-bold rounded-xl border transition-all duration-300 w-56">
          {{ gameStore.isAllMuted ? '🔊 Démuter tout le monde' : '🔇 Muter tout le monde' }}
        </button>
      </div>

      <button 
        @click="gameStore.isGMMuted = !gameStore.isGMMuted" 
        :class="gameStore.isGMMuted ? 'bg-red-900/50 border-red-700 text-red-400' : 'bg-gray-700 hover:bg-gray-600 border-gray-600 text-white'"
        class="px-6 py-3 rounded-xl border transition-colors flex items-center gap-2 font-medium">
        {{ gameStore.isGMMuted ? '🔇 Mon micro est coupé' : '🎙️ Mon micro est ouvert' }}
      </button>
    </header>

    <!-- Barre d'Actions de Nuit (Apparaît avec une animation douce) -->
    <transition enter-active-class="transition duration-500 ease-out" enter-from-class="transform -translate-y-4 opacity-0" enter-to-class="transform translate-y-0 opacity-100" leave-active-class="transition duration-300 ease-in" leave-from-class="transform translate-y-0 opacity-100" leave-to-class="transform -translate-y-4 opacity-0">
      <div v-if="gameStore.isNight" class="flex flex-wrap gap-4 mb-8 bg-indigo-950/50 p-5 rounded-2xl border border-indigo-800/50 backdrop-blur-sm">
        <h2 class="w-full text-indigo-300 font-bold tracking-wider text-sm uppercase">Actions de Nuit</h2>
        <button class="bg-indigo-700 hover:bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-medium transition shadow-lg">🐺 Loups-Garous</button>
        <button class="bg-purple-700 hover:bg-purple-600 text-white px-5 py-2.5 rounded-lg font-medium transition shadow-lg">🧪 Sorcière</button>
        <button class="bg-blue-700 hover:bg-blue-600 text-white px-5 py-2.5 rounded-lg font-medium transition shadow-lg">👁️ Voyante</button>
      </div>
    </transition>

    <!-- Grille des Joueurs (générée dynamiquement) -->
    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
      <PlayerCardGM 
        v-for="player in gameStore.players" 
        :key="player.id" 
        :player="player" 
      />
    </div>

  </div>
</template>