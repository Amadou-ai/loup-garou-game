<script setup>
import { ref } from "vue";
import { useGameStore } from "../stores/gameStore";

const game = useGameStore();
const name = ref(game.playerName || "");
const codeInput = ref("");

function onCreate() {
  if (!name.value.trim()) return game.notify("Indique ton prénom");
  game.playerName = name.value.trim();
  game.gotoCreate();
}

function onJoin() {
  if (!name.value.trim()) return game.notify("Indique ton prénom");
  if (!codeInput.value.trim()) return game.notify("Indique le code de la salle");
  game.joinRoom(name.value.trim(), codeInput.value.trim().toUpperCase());
}
</script>

<template>
  <div class="max-w-md mx-auto bg-gray-900 border border-gray-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
    <div class="text-center mb-8">
      <div class="text-6xl mb-3">🐺</div>
      <h1 class="text-4xl font-extrabold tracking-tight mb-2">Loup-Garou</h1>
      <p class="text-gray-400">Le village s'endort, les loups se réveillent…</p>
    </div>

    <label class="block text-sm font-medium text-gray-300 mb-1">Ton prénom</label>
    <input
      v-model="name"
      maxlength="20"
      placeholder="Ex : Alex"
      class="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 mb-6 text-white placeholder-gray-500 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 transition"
    />

    <button
      class="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-600/30 transition-all transform hover:scale-[1.02] mb-6"
      @click="onCreate"
    >
      🎩 Créer une partie (Maître du Jeu)
    </button>

    <div class="flex items-center gap-3 text-gray-600 text-xs uppercase tracking-widest mb-6">
      <span class="flex-1 h-px bg-gray-700"></span>
      ou rejoindre
      <span class="flex-1 h-px bg-gray-700"></span>
    </div>

    <div class="flex gap-2">
      <input
        v-model="codeInput"
        maxlength="5"
        placeholder="CODE"
        class="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white tracking-widest uppercase placeholder-gray-500 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 transition"
        @keyup.enter="onJoin"
      />
      <button
        class="bg-gray-700 hover:bg-gray-600 text-white font-semibold px-6 rounded-xl transition"
        @click="onJoin"
      >
        Rejoindre
      </button>
    </div>
  </div>
</template>
