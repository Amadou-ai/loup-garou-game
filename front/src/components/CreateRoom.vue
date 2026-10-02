<script setup>
import { computed, ref } from "vue";
import { useGameStore } from "../stores/gameStore";
import { CONFIGURABLE_ROLES, roleIcon } from "../roleMeta";

const game = useGameStore();

// Copie locale pour ne pas polluer le catalogue partagé
const roles = ref(CONFIGURABLE_ROLES.map((r) => ({ ...r })));

const totalPlayers = computed(() => roles.value.reduce((sum, r) => sum + r.count, 0));
const valid = computed(() => totalPlayers.value >= game.minPlayers);

function updateCount(role, delta) {
  if (role.count + delta >= 0) role.count += delta;
}

function createRoom() {
  if (!valid.value) {
    return game.notify(`Il faut au moins ${game.minPlayers} joueurs au total`);
  }
  const comp = {};
  for (const r of roles.value) {
    if (r.count > 0) comp[r.id] = r.count;
  }
  game.setComposition(comp, totalPlayers.value);
  game.createRoom();
}
</script>

<template>
  <div class="max-w-md mx-auto bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-2xl">
    <div class="text-center mb-8">
      <h2 class="text-3xl font-extrabold text-white tracking-tight mb-2">Nouvelle Partie</h2>
      <p class="text-gray-400">Configurez les rôles de votre village</p>
    </div>

    <!-- Compteur total dynamique -->
    <div
      class="rounded-2xl p-4 mb-6 flex justify-between items-center border"
      :class="valid ? 'bg-indigo-950/50 border-indigo-900/50' : 'bg-red-950/40 border-red-900/50'"
    >
      <span :class="valid ? 'text-indigo-300' : 'text-red-300'" class="font-medium">
        Nombre de joueurs (hors MJ) :
      </span>
      <span class="text-3xl font-bold text-white">{{ totalPlayers }}</span>
    </div>

    <!-- Liste des rôles avec boutons + et - -->
    <div class="space-y-4 mb-8 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
      <div
        v-for="role in roles"
        :key="role.id"
        class="flex items-center justify-between bg-gray-800 p-3 rounded-xl border border-gray-700"
      >
        <div class="flex items-center gap-3">
          <span class="text-3xl">{{ roleIcon(role.id) }}</span>
          <span class="font-semibold text-gray-200">{{ role.name }}</span>
        </div>

        <div class="flex items-center gap-4 bg-gray-900 rounded-lg p-1">
          <button
            class="w-8 h-8 flex items-center justify-center rounded-md bg-gray-800 hover:bg-gray-700 text-gray-300 transition"
            @click="updateCount(role, -1)"
          >
            −
          </button>
          <span class="w-4 text-center font-bold">{{ role.count }}</span>
          <button
            class="w-8 h-8 flex items-center justify-center rounded-md bg-gray-800 hover:bg-gray-700 text-gray-300 transition"
            @click="updateCount(role, 1)"
          >
            +
          </button>
        </div>
      </div>
    </div>

    <button
      class="w-full font-bold py-4 rounded-xl transition-all transform hover:scale-[1.02] mb-3"
      :class="
        valid
          ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30'
          : 'bg-gray-700 text-gray-400 cursor-not-allowed'
      "
      @click="createRoom"
    >
      Générer le code de la salle
    </button>

    <button class="w-full text-gray-400 hover:text-gray-200 text-sm py-2 transition" @click="game.backToLogin()">
      ← Retour
    </button>
  </div>
</template>
