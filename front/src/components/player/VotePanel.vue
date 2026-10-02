<script setup>
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { useGameStore } from "../../stores/gameStore";

const game = useGameStore();
const { playerList, socketId } = storeToRefs(game);

const targets = computed(() =>
  playerList.value.filter((p) => !p.isHost && p.alive && p.id !== socketId.value)
);
</script>

<template>
  <div class="w-full max-w-2xl bg-gray-900 border border-gray-800 rounded-2xl p-6">
    <h3 class="text-lg font-bold mb-4 text-white">🗳 Vote du village</h3>
    <div class="flex flex-wrap gap-2">
      <button
        v-for="p in targets"
        :key="p.id"
        class="px-4 py-2 rounded-xl bg-gray-800 hover:bg-red-700 border border-gray-700 hover:border-red-400 font-medium transition"
        @click="game.castVote(p.id)"
      >
        {{ p.name }}
      </button>
      <button
        class="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700 font-medium transition"
        @click="game.castVote(null)"
      >
        ⬜ Blanc
      </button>
    </div>
  </div>
</template>
