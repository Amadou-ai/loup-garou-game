<script setup>
/**
 * Chat de nuit : zone de texte visible UNIQUEMENT pendant que le rôle du joueur
 * est réveillé (même fenêtre que le micro). Le serveur filtre déjà les messages
 * par rôle (voir server.js -> event "night_chat") ; ce composant ne fait que
 * l'affichage et l'envoi.
 */
import { nextTick, ref } from "vue";
import { storeToRefs } from "pinia";
import { useGameStore } from "../../stores/gameStore";

const game = useGameStore();
const { canNightChat, nightMessages, myRole } = storeToRefs(game);

const text = ref("");
const listEl = ref(null);

async function send() {
  const value = text.value.trim();
  if (!value) return;
  text.value = "";
  await game.sendNightMessage(value);
  await nextTick();
  if (listEl.value) listEl.value.scrollTop = listEl.value.scrollHeight;
}

/** Anonymat : on signe par le RÔLE, jamais par le nom du joueur. */
function labelOf(m) {
  return m.mine ? "Toi" : m.roleName || "?";
}
</script>

<template>
  <div
    v-if="canNightChat"
    class="w-full max-w-2xl bg-gray-900 border border-indigo-800/60 rounded-2xl p-4"
  >
    <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
      <p class="text-sm font-bold text-indigo-300">
        {{ myRole?.name ? `🐾 Murmures des ${myRole.name}` : "🐾 Murmures" }}
      </p>
      <span class="text-xs text-gray-500">Visible par ton camp et le MJ uniquement</span>
    </div>

    <div ref="listEl" class="max-h-48 overflow-y-auto space-y-2 mb-3 pr-1">
      <p v-if="nightMessages.length === 0" class="text-gray-500 text-sm italic">
        Aucun message. Écris discrètement à ton équipe…
      </p>
      <div
        v-for="(m, i) in nightMessages"
        :key="i"
        class="text-sm"
        :class="m.mine ? 'text-right' : 'text-left'"
      >
        <span class="text-gray-500 text-xs">{{ labelOf(m) }}</span>
        <div
          class="inline-block px-3 py-1 rounded-xl break-words"
          :class="m.mine ? 'bg-indigo-700 text-white' : 'bg-gray-800 text-gray-200'"
        >
          {{ m.text }}
        </div>
      </div>
    </div>

    <form class="flex gap-2" @submit.prevent="send">
      <input
        v-model="text"
        maxlength="500"
        placeholder="Message pour ton camp…"
        class="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-500"
      />
      <button
        type="submit"
        class="px-4 py-2 rounded-xl bg-indigo-700 hover:bg-indigo-600 transition text-sm font-semibold"
      >
        Envoyer
      </button>
    </form>
  </div>
</template>
