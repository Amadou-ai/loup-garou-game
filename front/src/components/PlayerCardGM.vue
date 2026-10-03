<script setup>
import { computed, ref } from "vue";
import { useGameStore } from "../stores/gameStore";
import { roleIcon } from "../roleMeta";

const props = defineProps({
  player: { type: Object, required: true },
});

const game = useGameStore();
const flipped = ref(false);

const hasRole = computed(() => !!props.player.roleId);
const dead = computed(() => !props.player.alive);
</script>

<template>
  <div class="perspective h-48" :class="{ 'opacity-40 grayscale': dead }">
    <div
      class="relative w-full h-full preserve-3d transition-transform duration-500 cursor-pointer"
      :class="{ 'rotate-y-180': flipped }"
      @click="flipped = !flipped"
    >
      <!-- Face avant : infos joueur + contrôles -->
      <div
        class="absolute inset-0 backface-hidden rounded-2xl p-4 flex flex-col border-2 bg-gray-900 border-gray-800"
      >
        <div class="flex items-center gap-2 min-w-0 mb-2">
          <span class="text-2xl">👤</span>
          <b class="truncate">{{ player.name }}</b>
        </div>

        <div class="flex-1 flex flex-col justify-center text-sm text-gray-400 gap-1">
          <span :class="player.alive ? 'text-green-400' : 'text-red-400'">
            {{ player.alive ? "● Vivant" : "☠ Mort" }}
          </span>
          <span>{{ player.muted ? "🔇 Micro coupé" : "🎤 Micro ouvert" }}</span>
          <span v-if="player.votes">{{ player.votes }} vote(s)</span>
          <span v-else-if="hasRole" class="text-gray-600">Touche pour voir le rôle</span>
        </div>

        <div class="flex gap-2 mt-2">
          <button
            class="flex-1 py-2 rounded-lg text-sm font-semibold transition"
            :class="player.muted ? 'bg-green-700 hover:bg-green-600' : 'bg-gray-700 hover:bg-gray-600'"
            @click.stop="game.toggleMutePlayer(player)"
          >
            {{ player.muted ? "🔊" : "🔇" }}
          </button>
          <button
            class="flex-1 py-2 rounded-lg text-sm font-semibold transition"
            :class="player.alive ? 'bg-red-700 hover:bg-red-600' : 'bg-gray-700 hover:bg-gray-600'"
            @click.stop="game.killPlayer(player)"
          >
            {{ player.alive ? "☠ Tuer" : "↺ Revivre" }}
          </button>
        </div>
      </div>

      <!-- Face arrière : le rôle -->
      <div
        class="absolute inset-0 backface-hidden rotate-y-180 rounded-2xl p-4 flex flex-col items-center justify-center border-2 bg-indigo-950 border-indigo-700"
      >
        <span class="text-5xl mb-2">{{ roleIcon(player.roleId) }}</span>
        <b class="text-lg text-indigo-100">{{ player.roleName || "—" }}</b>
        <span class="text-xs text-indigo-400 mt-1">{{ player.name }}</span>
      </div>
    </div>
  </div>
</template>
