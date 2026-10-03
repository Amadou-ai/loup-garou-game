<script setup>
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { useGameStore } from "../../stores/gameStore";
import PlayerCard from "./PlayerCard.vue";
import NightAction from "./NightAction.vue";
import NightChat from "./NightChat.vue";
import VotePanel from "./VotePanel.vue";
import { teamLabel } from "../../roleMeta";

const game = useGameStore();
const { code, phase, phaseLabel, myRole, playerList, socketId, me, selfMuted, audio, winner } =
  storeToRefs(game);

const alive = computed(() => me.value.alive !== false);
const others = computed(() => playerList.value.filter((p) => !p.isHost));

function micLabel() {
  if (selfMuted.value) return "🔇 Micro coupé";
  if (audio.value.mic) return "🎤 Micro";
  return "🔇 Micro coupé par le MJ";
}
</script>

<template>
  <div class="flex flex-col items-center">
    <!-- Barre d'état -->
    <div class="w-full flex flex-wrap items-center justify-between gap-3 mb-6">
      <div class="flex items-center gap-3">
        <span class="bg-gray-900 border border-gray-700 rounded-xl px-4 py-2 font-mono tracking-widest">
          {{ code }}
        </span>
        <span class="text-indigo-300 font-semibold">{{ phaseLabel }}</span>
        <span v-if="!alive" class="text-red-400 font-semibold">💀 tu es mort</span>
      </div>
      <div class="flex items-center gap-2">
        <button
          class="px-4 py-2 rounded-xl bg-gray-700 hover:bg-gray-600 transition text-sm font-semibold"
          @click="game.toggleSelfMuted()"
        >
          {{ micLabel() }}
        </button>
        <button
          class="px-4 py-2 rounded-xl bg-red-800/80 hover:bg-red-700 transition text-sm font-semibold"
          @click="game.leaveRoom()"
        >
          🚪 Quitter
        </button>
      </div>
    </div>

    <!-- Titre ambiance -->
    <div class="text-center mb-8">
      <h1
        v-if="phase === 'night'"
        class="text-4xl font-light tracking-widest text-indigo-300 drop-shadow-lg"
      >
        LA NUIT TOMBE…
      </h1>
      <h1
        v-else-if="phase === 'vote'"
        class="text-4xl font-light tracking-widest text-red-300 drop-shadow-lg"
      >
        LE VILLAGE VOTE…
      </h1>
      <h1
        v-else-if="phase === 'ended'"
        class="text-4xl font-light tracking-widest text-yellow-300 drop-shadow-lg"
      >
        FIN DE LA PARTIE
      </h1>
      <h1
        v-else
        class="text-4xl font-light tracking-widest text-yellow-400 drop-shadow-lg"
      >
        LE JOUR SE LÈVE…
      </h1>
      <p class="text-gray-400 mt-3 font-medium">Touche ta carte pour découvrir ton rôle secrètement.</p>
    </div>

    <!-- Carte de rôle -->
    <PlayerCard class="mb-8" :role="myRole" :player-name="game.playerName" />

    <!-- Victoire -->
    <div
      v-if="winner"
      class="w-full max-w-md mb-6 rounded-2xl border border-yellow-500/40 bg-yellow-500/10 px-5 py-4 text-center text-yellow-200 font-semibold"
    >
      🏁 Victoire des <b>{{ teamLabel(winner) }}</b>
    </div>

    <!-- Action de nuit -->
    <NightAction v-if="phase === 'night'" class="mb-6" />

    <!-- Chat de nuit (n'apparaît que si le rôle est réveillé) -->
    <NightChat v-if="phase === 'night'" class="mb-6" />

    <!-- Vote -->
    <VotePanel v-if="phase === 'vote' && alive" class="mb-6" />

    <!-- Autres joueurs -->
    <div class="w-full max-w-2xl bg-gray-900 border border-gray-800 rounded-2xl p-4">
      <p class="text-xs uppercase tracking-widest text-gray-500 mb-3">Joueurs</p>
      <div class="flex flex-wrap gap-2">
        <span
          v-for="p in others"
          :key="p.id"
          class="px-3 py-1 rounded-lg text-sm border"
          :class="
            p.alive
              ? 'bg-gray-800 border-gray-700 text-gray-200'
              : 'bg-gray-900 border-gray-800 text-gray-600 line-through'
          "
        >
          {{ p.name }}
        </span>
      </div>
    </div>
  </div>
</template>
