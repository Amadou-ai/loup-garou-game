<script setup>
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { useGameStore } from "../../stores/gameStore";

const game = useGameStore();
const { myRole, awake, inspectResult, witchInfo, playerList, socketId, me } = storeToRefs(game);

const alive = computed(() => me.value.alive !== false);

/** Cibles possibles : autres joueurs vivants (hors MJ). */
const targets = computed(() =>
  playerList.value.filter((p) => !p.isHost && p.alive && p.id !== socketId.value)
);

const witch = computed(() => witchInfo.value || { potions: {} });

function nameOf(id) {
  return (playerList.value.find((p) => p.id === id) || {}).name || "?";
}

const showKillOrInspect = computed(() => ["kill", "inspect"].includes(myRole.value?.action));
</script>

<template>
  <div v-if="!myRole" />
  <div
    v-else-if="!awake"
    class="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl p-6 text-center text-gray-400"
  >
    🌙 La nuit tombe… tu dors.
  </div>
  <div v-else-if="!alive" />
  <div v-else-if="showKillOrInspect" class="w-full max-w-2xl bg-gray-900 border border-gray-800 rounded-2xl p-6">
    <h3 class="text-lg font-bold mb-4 text-white">
      {{ myRole.action === "kill" ? "🐺 Désigne ta victime" : "👁 Qui inspecter ?" }}
    </h3>
    <div class="flex flex-wrap gap-2">
      <button
        v-for="p in targets"
        :key="p.id"
        class="px-4 py-2 rounded-xl bg-gray-800 hover:bg-indigo-600 border border-gray-700 hover:border-indigo-400 font-medium transition"
        @click="game.nightAction({ targetId: p.id })"
      >
        {{ p.name }}
      </button>
    </div>
    <p v-if="inspectResult" class="mt-4 text-indigo-300 font-semibold">
      Tu as vu : {{ inspectResult.role }}
    </p>
  </div>
  <div v-else-if="myRole.action === 'witch'" class="w-full max-w-2xl bg-gray-900 border border-gray-800 rounded-2xl p-6">
    <h3 class="text-lg font-bold mb-4 text-white">🧪 Sorcière</h3>
    <p class="text-gray-300 mb-4">
      Victime des loups :
      <b class="text-red-300">{{ witch.victimId ? nameOf(witch.victimId) : "personne" }}</b>
    </p>
    <button
      class="px-4 py-2 rounded-xl font-semibold transition mb-6"
      :class="witch.potions?.save ? 'bg-green-700 hover:bg-green-600' : 'bg-gray-700 text-gray-500 cursor-not-allowed'"
      :disabled="!witch.potions?.save"
      @click="game.nightAction({ save: true })"
    >
      💚 La sauver
    </button>

    <p class="text-gray-300 mb-2">Empoisonner :</p>
    <div v-if="witch.potions?.poison" class="flex flex-wrap gap-2">
      <button
        v-for="p in targets"
        :key="p.id"
        class="px-4 py-2 rounded-xl bg-gray-800 hover:bg-purple-700 border border-gray-700 font-medium transition"
        @click="game.nightAction({ poisonTargetId: p.id })"
      >
        {{ p.name }}
      </button>
    </div>
    <span v-else class="text-gray-500 text-sm italic">Potion de poison déjà utilisée</span>
  </div>
  <div
    v-else
    class="w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl p-6 text-center text-indigo-200"
  >
    Tu es réveillé, écoute le Maître du Jeu.
  </div>
</template>
