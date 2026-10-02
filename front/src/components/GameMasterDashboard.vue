<script setup>
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { useGameStore } from "../stores/gameStore";
import PlayerCardGM from "./PlayerCardGM.vue";
import { teamLabel } from "../roleMeta";

const game = useGameStore();
const { code, phase, phaseLabel, hostState, isNight, winner, selfMuted } = storeToRefs(game);

const players = computed(() => hostState.value?.players || []);
const nightRoles = computed(() => hostState.value?.nightRoles || []);
const awakeRole = computed(() => hostState.value?.awakeRole || null);
const allMuted = computed(() => !!hostState.value?.allMuted);
const wolfVictim = computed(() => hostState.value?.wolfVictim || null);
const isLobby = computed(() => phase.value === "lobby");

const aliveCount = computed(() => players.value.filter((p) => p.alive).length);

function nameOf(id) {
  return (players.value.find((p) => p.id === id) || {}).name || "?";
}

function toggleRole(roleId) {
  if (awakeRole.value === roleId) game.sleepAll();
  else game.wakeRole(roleId);
}
</script>

<template>
  <div>
    <!-- Barre supérieure -->
    <div class="flex flex-wrap items-center justify-between gap-3 mb-5">
      <div class="flex items-center gap-3">
        <span class="bg-gray-900 border border-gray-700 rounded-xl px-4 py-2 font-mono tracking-widest">
          {{ code }}
        </span>
        <span class="text-indigo-300 font-semibold">{{ phaseLabel }}</span>
        <span class="text-gray-500 text-sm">{{ aliveCount }} / {{ players.length }} vivants</span>
      </div>

      <div class="flex items-center gap-2">
        <button
          class="px-4 py-2 rounded-xl font-semibold transition text-sm disabled:opacity-40 disabled:cursor-not-allowed"
          :class="allMuted ? 'bg-green-600 hover:bg-green-500' : 'bg-gray-700 hover:bg-gray-600'"
          :disabled="isNight"
          @click="game.toggleMuteAll()"
        >
          {{ allMuted ? "🔊 Rendre la parole" : "🔇 Couper tout le monde" }}
        </button>
        <button
          class="px-4 py-2 rounded-xl bg-gray-700 hover:bg-gray-600 transition text-sm"
          @click="game.toggleSelfMuted()"
        >
          {{ selfMuted ? "🎤 Réactiver mon micro" : "🎤 Couper mon micro" }}
        </button>
        <button
          class="px-4 py-2 rounded-xl bg-red-800/80 hover:bg-red-700 transition text-sm font-semibold"
          title="Fermer la partie pour tout le monde"
          @click="game.closeRoom()"
        >
          ✖ Fermer la partie
        </button>
      </div>
    </div>

    <!-- Victoire -->
    <div
      v-if="winner"
      class="mb-5 rounded-2xl border border-yellow-500/40 bg-yellow-500/10 px-5 py-4 text-yellow-200 font-semibold"
    >
      🏁 Victoire des <b>{{ teamLabel(winner) }}</b>
    </div>

    <!-- Contrôles de phase -->
    <div v-if="!isLobby && phase !== 'ended'" class="flex flex-wrap gap-3 mb-5">
      <button
        v-if="isNight"
        class="px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-gray-900 font-bold transition"
        @click="game.startDay()"
      >
        ☀️ Passer au jour
      </button>
      <button
        v-else
        class="px-5 py-3 rounded-xl bg-indigo-700 hover:bg-indigo-600 font-bold transition"
        @click="game.startNight()"
      >
        🌙 Passer à la nuit
      </button>

      <button
        v-if="phase === 'vote'"
        class="px-5 py-3 rounded-xl bg-red-700 hover:bg-red-600 font-bold transition"
        @click="game.resolveVote()"
      >
        🗳 Dépouiller le vote
      </button>
      <button
        v-else-if="!isNight"
        class="px-5 py-3 rounded-xl bg-gray-700 hover:bg-gray-600 font-bold transition"
        @click="game.startVote()"
      >
        🗳 Lancer le vote
      </button>
    </div>

    <!-- Panneau de nuit : réveiller les rôles un par un -->
    <div v-if="isNight" class="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-6">
      <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h3 class="font-bold text-white">🌙 Ordre de réveil</h3>
        <span class="text-sm text-gray-400">
          Victime des loups : <b class="text-red-300">{{ wolfVictim ? nameOf(wolfVictim) : "aucune" }}</b>
        </span>
      </div>

      <div class="flex flex-wrap gap-2">
        <button
          v-for="r in nightRoles"
          :key="r.id"
          class="px-4 py-2 rounded-xl font-semibold transition text-sm border"
          :class="
            awakeRole === r.id
              ? 'bg-indigo-600 border-indigo-400 text-white'
              : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
          "
          @click="toggleRole(r.id)"
        >
          {{ awakeRole === r.id ? `😴 ${r.name} réveillé` : `👁 Réveiller ${r.name}` }}
        </button>
      </div>
      <p class="text-xs text-gray-500 mt-3">Seul le rôle réveillé (et toi) entendez la conversation.</p>
    </div>

    <!-- Grille des joueurs (vue globale) -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      <PlayerCardGM
        v-for="p in players"
        :key="p.id"
        :player="p"
        :awake="awakeRole && p.roleId === awakeRole"
      />
      <div
        v-if="players.length === 0"
        class="col-span-full text-center text-gray-500 italic p-8 bg-gray-900 rounded-2xl border border-gray-800"
      >
        En attente de joueurs… partage le code.
      </div>
    </div>
  </div>
</template>
