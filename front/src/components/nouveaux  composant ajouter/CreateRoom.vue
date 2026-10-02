<script setup>
import { ref, computed } from 'vue'

const emit = defineEmits(['roomCreated'])

// Liste des rôles configurables
const roles = ref([
  { id: 'loup', name: 'Loup-Garou', icon: '🐺', count: 2 },
  { id: 'sorciere', name: 'Sorcière', icon: '🧪', count: 1 },
  { id: 'voyante', name: 'Voyante', icon: '👁️', count: 1 },
  { id: 'chasseur', name: 'Chasseur', icon: '🏹', count: 0 },
  { id: 'villageois', name: 'Simple Villageois', icon: '🌾', count: 4 },
])

const totalPlayers = computed(() => roles.value.reduce((sum, role) => sum + role.count, 0))

const updateCount = (role, delta) => {
  if (role.count + delta >= 0) {
    role.count += delta
  }
}
</script>

<template>
  <div class="max-w-md mx-auto bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-2xl">
    
    <div class="text-center mb-8">
      <h2 class="text-3xl font-extrabold text-white tracking-tight mb-2">Nouvelle Partie</h2>
      <p class="text-gray-400">Configurez les rôles de votre village</p>
    </div>

    <!-- Compteur total dynamique -->
    <div class="bg-indigo-950/50 border border-indigo-900/50 rounded-2xl p-4 mb-6 flex justify-between items-center">
      <span class="text-indigo-300 font-medium">Nombre de joueurs :</span>
      <span class="text-3xl font-bold text-white">{{ totalPlayers }}</span>
    </div>

    <!-- Liste des rôles avec boutons + et - -->
    <div class="space-y-4 mb-8 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
      <div v-for="role in roles" :key="role.id" class="flex items-center justify-between bg-gray-800 p-3 rounded-xl border border-gray-700">
        <div class="flex items-center gap-3">
          <span class="text-3xl">{{ role.icon }}</span>
          <span class="font-semibold text-gray-200">{{ role.name }}</span>
        </div>
        
        <div class="flex items-center gap-4 bg-gray-900 rounded-lg p-1">
          <button @click="updateCount(role, -1)" class="w-8 h-8 flex items-center justify-center rounded-md bg-gray-800 hover:bg-gray-700 text-gray-300 transition">
            -
          </button>
          <span class="w-4 text-center font-bold">{{ role.count }}</span>
          <button @click="updateCount(role, 1)" class="w-8 h-8 flex items-center justify-center rounded-md bg-gray-800 hover:bg-gray-700 text-gray-300 transition">
            +
          </button>
        </div>
      </div>
    </div>

    <button 
      @click="emit('roomCreated', totalPlayers)"
      class="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-600/30 transition-all transform hover:scale-[1.02]">
      Générer le code de la salle
    </button>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 6px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #4b5563; border-radius: 10px; }
</style>