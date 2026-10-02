<script setup>
import { computed, ref } from "vue";
import { storeToRefs } from "pinia";
import { useGameStore } from "../stores/gameStore";

const game = useGameStore();
const { code, isGM, others, expected, minPlayers } = storeToRefs(game);

const copied = ref(false);

// Cible affichée : la composition choisie par le MJ (diffusée à tous),
// avec au strict minimum le nombre de joueurs requis par les règles.
const targetCount = computed(() => Math.max(expected.value || 0, minPlayers.value));
// On peut lancer dès qu'on atteint le MINIMUM de joueurs, même si la
// composition prévue n'est pas complète (le moteur complète en villageois).
const canStart = computed(() => others.value.length >= minPlayers.value);
const emptySlots = computed(() => Math.max(0, targetCount.value - others.value.length));

function copyCode() {
  navigator.clipboard?.writeText(code.value);
  copied.value = true;
  setTimeout(() => (copied.value = false), 2000);
}

function startGame() {
  game.startGame();
}
</script>

<template>
  <div class="max-w-2xl mx-auto flex flex-col items-center">
    <!-- Code de la Room -->
    <div
      class="bg-gray-900 border-2 border-dashed border-gray-700 rounded-3xl p-8 mb-8 text-center w-full shadow-2xl relative overflow-hidden"
    >
      <div class="absolute -top-10 -right-10 text-9xl opacity-5">🐺</div>

      <p class="text-gray-400 font-medium mb-2 uppercase tracking-widest text-sm">
        Code pour rejoindre
      </p>
      <h1 class="text-5xl sm:text-7xl font-black text-white tracking-widest mb-4 drop-shadow-md">
        {{ code }}
      </h1>
      <button
        class="bg-gray-800 hover:bg-gray-700 text-sm px-4 py-2 rounded-lg text-gray-300 font-medium transition"
        @click="copyCode"
      >
        {{ copied ? "✅ Copié !" : "📋 Copier le code" }}
      </button>
    </div>

    <!-- Joueurs connectés -->
    <div class="w-full mb-8">
      <div class="flex justify-between items-end mb-1 px-2">
        <h3 class="text-xl font-bold text-white">Joueurs dans le lobby</h3>
        <span class="text-indigo-400 font-mono">{{ others.length }} / {{ targetCount }}</span>
      </div>
      <p class="text-xs text-gray-500 mb-4 px-2">
        Minimum {{ minPlayers }} joueurs pour lancer
        <span v-if="expected && expected > minPlayers">· {{ expected }} prévus</span>
      </p>

      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <!-- Joueurs présents -->
        <div
          v-for="player in others"
          :key="player.id"
          class="bg-indigo-900/40 border border-indigo-700/50 rounded-xl p-4 flex flex-col items-center justify-center animate-pulse-once"
        >
          <span class="text-3xl mb-2">👤</span>
          <span class="font-bold text-indigo-100 truncate max-w-full">{{ player.name }}</span>
        </div>

        <!-- Slots vides en attente -->
        <div
          v-for="i in emptySlots"
          :key="'empty' + i"
          class="bg-gray-800/50 border border-gray-700 border-dashed rounded-xl p-4 flex flex-col items-center justify-center opacity-50"
        >
          <span class="text-3xl mb-2">⏳</span>
          <span class="font-medium text-gray-500 text-sm">En attente…</span>
        </div>
      </div>
    </div>

    <!-- Bouton de lancement (Visible uniquement par le MJ) -->
    <div v-if="isGM" class="w-full space-y-2">
      <button
        class="w-full font-bold py-4 rounded-xl transition-all text-lg"
        :disabled="!canStart"
        :class="
          canStart
            ? 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-600/30 transform hover:scale-[1.02]'
            : 'bg-gray-700 text-gray-500 cursor-not-allowed'
        "
        @click="startGame"
      >
        {{ canStart ? "🚀 Lancer la partie" : `En attente des joueurs… (min ${minPlayers})` }}
      </button>
      <button
        class="w-full py-2 rounded-xl bg-red-900/40 hover:bg-red-900/60 border border-red-800/40 text-red-300 text-sm font-semibold transition"
        @click="game.closeRoom()"
      >
        ✖ Fermer la room
      </button>
      <p
        v-if="canStart && others.length < targetCount"
        class="text-xs text-center text-gray-500 mt-2"
      >
        Tu peux lancer maintenant, ou attendre les autres joueurs.
      </p>
    </div>
    <div
      v-else
      class="w-full space-y-2"
    >
      <p class="text-gray-400 italic text-center w-full p-4 bg-gray-900 rounded-xl border border-gray-800">
        En attente du Maître du Jeu pour commencer…
      </p>
      <button
        class="w-full py-2 rounded-xl bg-red-900/40 hover:bg-red-900/60 border border-red-800/40 text-red-300 text-sm font-semibold transition"
        @click="game.leaveRoom()"
      >
        🚪 Quitter la room
      </button>
    </div>
  </div>
</template>
