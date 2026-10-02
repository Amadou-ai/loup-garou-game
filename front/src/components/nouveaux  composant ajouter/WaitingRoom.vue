<script setup>
const props = defineProps({
  isGM: Boolean,
  expectedPlayers: { type: Number, default: 8 }
})

const emit = defineEmits(['startGame'])

// Faux joueurs pour le visuel
const connectedPlayers = ['Alex', 'Sam', 'Chris']
</script>

<template>
  <div class="max-w-2xl mx-auto flex flex-col items-center">
    
    <!-- Code de la Room -->
    <div class="bg-gray-900 border-2 border-dashed border-gray-700 rounded-3xl p-8 mb-8 text-center w-full shadow-2xl relative overflow-hidden">
      <!-- Décoration d'arrière plan -->
      <div class="absolute -top-10 -right-10 text-9xl opacity-5">🐺</div>
      
      <p class="text-gray-400 font-medium mb-2 uppercase tracking-widest text-sm">Code pour rejoindre</p>
      <h1 class="text-5xl sm:text-7xl font-black text-white tracking-widest mb-4 drop-shadow-md">
        X7K-9P2
      </h1>
      <button class="bg-gray-800 hover:bg-gray-700 text-sm px-4 py-2 rounded-lg text-gray-300 font-medium transition">
        📋 Copier le lien
      </button>
    </div>

    <!-- Joueurs connectés -->
    <div class="w-full mb-8">
      <div class="flex justify-between items-end mb-4 px-2">
        <h3 class="text-xl font-bold text-white">Joueurs dans le lobby</h3>
        <span class="text-indigo-400 font-mono">{{ connectedPlayers.length }} / {{ expectedPlayers }}</span>
      </div>
      
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <!-- Joueurs présents -->
        <div v-for="player in connectedPlayers" :key="player" class="bg-indigo-900/40 border border-indigo-700/50 rounded-xl p-4 flex flex-col items-center justify-center animate-pulse-once">
          <span class="text-3xl mb-2">👤</span>
          <span class="font-bold text-indigo-100">{{ player }}</span>
        </div>
        
        <!-- Slots vides en attente -->
        <div v-for="i in (expectedPlayers - connectedPlayers.length)" :key="'empty'+i" class="bg-gray-800/50 border border-gray-700 border-dashed rounded-xl p-4 flex flex-col items-center justify-center opacity-50">
          <span class="text-3xl mb-2">⏳</span>
          <span class="font-medium text-gray-500 text-sm">En attente...</span>
        </div>
      </div>
    </div>

    <!-- Bouton de lancement (Visible uniquement par le MJ) -->
    <div v-if="isGM" class="w-full">
      <button 
        @click="emit('startGame')"
        :disabled="connectedPlayers.length < expectedPlayers"
        :class="connectedPlayers.length < expectedPlayers ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-600/30 transform hover:scale-[1.02]'"
        class="w-full font-bold py-4 rounded-xl transition-all text-lg">
        {{ connectedPlayers.length < expectedPlayers ? 'En attente des joueurs...' : '🚀 Lancer la partie' }}
      </button>
    </div>
    <div v-else class="text-gray-400 italic text-center w-full p-4 bg-gray-900 rounded-xl border border-gray-800">
      En attente du Maître du Jeu pour commencer...
    </div>

  </div>
</template>