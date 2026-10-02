<script setup>
import { ref } from 'vue'
import { useGameStore } from './stores/gameStore'
import CreateRoom from './components/CreateRoom.vue'
import WaitingRoom from './components/WaitingRoom.vue'
import GameMasterDashboard from './components/GameMasterDashboard.vue'
import PlayerDashboard from './components/PlayerDashboard.vue'

const gameStore = useGameStore()

// Gestion des écrans : 'create' -> 'lobby' -> 'game'
const currentStep = ref('create') 
const currentRole = ref('gm')
const expectedPlayerCount = ref(8)

// Fonctions de transition visuelle
const onRoomCreated = (count) => {
  expectedPlayerCount.value = count
  currentStep.value = 'lobby'
}

const onStartGame = () => {
  currentStep.value = 'game'
}
</script>

<template>
  <div :class="['min-h-screen font-sans text-white transition-colors duration-1000', 
               (currentStep === 'game' && gameStore.isNight) ? 'bg-gray-950' : 'bg-slate-800']">
    
    <!-- Barre de débug en haut (Garde-la pour tester tes vues facilement) -->
    <header class="bg-gray-900 text-xs px-4 py-2 flex justify-between items-center border-b border-gray-700 sticky top-0 z-50">
      <div class="flex gap-2">
        <button @click="currentStep = 'create'" :class="currentStep === 'create' ? 'text-indigo-400 font-bold' : 'text-gray-500'">1. Création</button>
        <span class="text-gray-600">|</span>
        <button @click="currentStep = 'lobby'" :class="currentStep === 'lobby' ? 'text-indigo-400 font-bold' : 'text-gray-500'">2. Lobby</button>
        <span class="text-gray-600">|</span>
        <button @click="currentStep = 'game'" :class="currentStep === 'game' ? 'text-indigo-400 font-bold' : 'text-gray-500'">3. Jeu</button>
      </div>
      
      <div class="flex gap-2">
        <button @click="currentRole = 'gm'" :class="currentRole === 'gm' ? 'bg-indigo-600 text-white' : 'bg-gray-800'" class="px-2 py-1 rounded">Vue MJ</button>
        <button @click="currentRole = 'player'" :class="currentRole === 'player' ? 'bg-indigo-600 text-white' : 'bg-gray-800'" class="px-2 py-1 rounded">Vue Joueur</button>
      </div>
    </header>

    <!-- Affichage dynamique de l'étape -->
    <main class="p-4 sm:p-8 flex items-center justify-center min-h-[90vh]">
      
      <CreateRoom 
        v-if="currentStep === 'create'" 
        @roomCreated="onRoomCreated" 
        class="w-full" 
      />

      <WaitingRoom 
        v-else-if="currentStep === 'lobby'" 
        :isGM="currentRole === 'gm'" 
        :expectedPlayers="expectedPlayerCount"
        @startGame="onStartGame" 
        class="w-full"
      />

      <div v-else-if="currentStep === 'game'" class="w-full max-w-7xl mx-auto">
        <GameMasterDashboard v-if="currentRole === 'gm'" />
        <PlayerDashboard v-else />
      </div>

    </main>

  </div>
</template>