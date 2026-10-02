<script setup>
import { storeToRefs } from "pinia";
import { useGameStore } from "./stores/gameStore";
import Lobby from "./components/Lobby.vue";
import CreateRoom from "./components/CreateRoom.vue";
import WaitingRoom from "./components/WaitingRoom.vue";
import GameMasterDashboard from "./components/GameMasterDashboard.vue";
import PlayerDashboard from "./components/player/PlayerDashboard.vue";

const game = useGameStore();
const { screen, toast, isNight, isGM } = storeToRefs(game);
</script>

<template>
  <div
    class="min-h-screen font-sans text-white transition-colors duration-1000"
    :class="screen === 'game' && isNight ? 'bg-gray-950' : 'bg-slate-800'"
  >
    <!-- Toast (erreurs serveur, résultats de nuit/vote...) -->
    <transition name="fade">
      <div
        v-if="toast"
        class="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 max-w-[92%] rounded-xl bg-gray-900/95 border border-indigo-500/40 px-5 py-3 text-sm text-indigo-100 shadow-2xl backdrop-blur"
      >
        {{ toast }}
      </div>
    </transition>

    <main class="p-4 sm:p-8 flex items-center justify-center min-h-screen">
      <Lobby v-if="screen === 'login'" class="w-full" />

      <CreateRoom v-else-if="screen === 'create'" class="w-full" />

      <WaitingRoom v-else-if="screen === 'lobby'" class="w-full" />

      <div v-else class="w-full max-w-7xl mx-auto">
        <GameMasterDashboard v-if="isGM" />
        <PlayerDashboard v-else />
      </div>
    </main>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
