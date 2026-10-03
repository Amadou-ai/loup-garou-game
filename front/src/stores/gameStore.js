import { defineStore } from "pinia";
import { computed, ref, watch } from "vue";
import { io } from "socket.io-client";
import { createWebRTC } from "../composables/webrtc";

const PHASE_LABELS = {
  lobby: "Salon",
  ready: "Rôles distribués",
  night: "🌙 Nuit",
  day: "☀️ Jour",
  vote: "🗳 Vote",
  ended: "🏁 Fin",
};

/**
 * Store Pinia = coeur de l'appli. Il parle au backend Socket.io
 * (server.js) et remplace le mock. Les composants ne font que lire
 * l'état réactif et appeler les actions ci-dessous.
 */
export const useGameStore = defineStore("game", () => {
  // ---- Couche réseau ----
  const socket = io("");
  const webrtc = createWebRTC(socket);
  const connected = ref(socket.connected);
  const socketId = ref(socket.id || "");

  // ---- État de navigation / partie ----
  const playerName = ref("");
  const step = ref("login"); // login | create | lobby
  const view = ref("player"); // host | player
  const code = ref("");
  const phase = ref("lobby");
  const playerList = ref([]); // [{ id, name, alive, isHost }]
  const hostState = ref(null); // état complet réservé au MJ
  const roomInfo = ref(null); // { code, hostName, expectedPlayers, minPlayers }
  const winner = ref(null);

  // ---- État du joueur ----
  const myRole = ref(null);
  const awake = ref(false);
  const inspectResult = ref(null);
  const witchInfo = ref(null);
  const audio = ref({ mic: true, listen: true });
  const selfMuted = ref(false);
  const toast = ref("");
  // Messages de nuit échangés entre les joueurs du rôle actuellement réveillé
  // (et copie reçue par le MJ pour qu'il suive). Anonymes : signés par le RÔLE,
  // jamais par le nom du joueur. Vidés à chaque réveil/phase.
  const nightMessages = ref([]); // [{ text, roleId, roleName, at, mine? }]

  // ---- Composition choisie par le MJ (avant création de la room) ----
  const composition = ref(null);
  const expectedPlayers = ref(0);

  // ---- Getters ----
  const isNight = computed(() => phase.value === "night");
  const isGM = computed(() => view.value === "host");
  const phaseLabel = computed(() => PHASE_LABELS[phase.value] || phase.value);
  // NB : doit rester aligné sur config/rules.js (minPlayers) côté backend.
  const minPlayers = computed(() => roomInfo.value?.minPlayers ?? hostState.value?.minPlayers ?? 3);
  const expected = computed(
    () => roomInfo.value?.expectedPlayers ?? expectedPlayers.value ?? 0
  );
  const others = computed(() => playerList.value.filter((p) => !p.isHost));
  const me = computed(
    () => playerList.value.find((p) => p.id === socketId.value) || { alive: true }
  );
  // La zone de chat de nuit n'apparaît que pendant que le rôle est réveillé :
  // même condition que le micro (nuit + role_wake reçu), plus "être en vie".
  const canNightChat = computed(
    () => phase.value === "night" && awake.value && me.value.alive !== false
  );

  /** Écran affiché, dérivé de l'étape choisie + de la phase serveur. */
  const screen = computed(() => {
    if (step.value === "login") return "login";
    if (step.value === "create") return "create";
    if (phase.value === "lobby") return "lobby";
    return "game";
  });

  // ---- Notifications ----
  function notify(msg) {
    if (!msg) return;
    toast.value = msg;
    setTimeout(() => {
      if (toast.value === msg) toast.value = "";
    }, 6000);
  }

  // ---- Écouteurs serveur ----
  const onConnect = () => {
    connected.value = true;
    socketId.value = socket.id;
  };
  const onDisconnect = () => {
    connected.value = false;
  };
  const onPlayerList = (list) => {
    playerList.value = list;
    const otherIds = list.map((p) => p.id).filter((id) => id !== socket.id);
    webrtc.syncPeers(socket.id, otherIds);
  };
  const onRoomInfo = (info) => {
    roomInfo.value = info;
  };
  const onHostState = (h) => {
    hostState.value = h;
    phase.value = h.phase;
    winner.value = h.winner;
  };
  const onYourRole = (r) => {
    myRole.value = r;
    phase.value = "ready";
  };
  const onPhaseChanged = ({ phase: next }) => {
    phase.value = next;
    awake.value = false;
    inspectResult.value = null;
    nightMessages.value = []; // on repart d'une conversation vierge à chaque phase
    if (next !== "night") witchInfo.value = null;
  };
  const onRoleWake = () => {
    awake.value = true;
    nightMessages.value = []; // nouveau rôle réveillé = nouveau fil de discussion
  };
  const onRoleSleep = () => {
    awake.value = false;
  };
  const onNightChat = (m) => {
    nightMessages.value.push(m);
  };
  const onWitchInfo = (i) => {
    witchInfo.value = i;
  };
  const onInspectResult = (r) => {
    inspectResult.value = r;
  };
  const onNightResult = ({ deaths }) =>
    notify(
      deaths.length
        ? "Morts cette nuit : " +
            deaths.map((d) => d.name + (d.roleName ? ` (${d.roleName})` : "")).join(", ")
        : "Personne n'est mort cette nuit"
    );
  const onVoteResult = (r) =>
    notify(
      r.eliminatedName
        ? `${r.eliminatedName} est éliminé (${r.eliminatedRole})`
        : "Égalité : personne n'est éliminé"
    );
  const onGameOver = ({ winner: w }) => {
    phase.value = "ended";
    winner.value = w;
  };
  const onHostLeft = () => {
    notify("Le Maître du Jeu est parti — partie fermée");
    resetToLogin();
  };
  /** La room n'existe plus (fermée par le MJ, partie finie, ou départ volontaire) :
   *  on coupe TOUT l'audio WebRTC puis on revient à l'accueil. Sans ça, les
   *  connexions P2P restaient ouvertes et on continuait d'entendre les autres. */
  const onRoomClosed = ({ reason } = {}) => {
    if (reason === "you_left") {
      resetToLogin();
      return;
    }
    if (reason === "host_closed") notify("Le Maître du Jeu a fermé la partie");
    else if (reason === "host_left") notify("Le Maître du Jeu est parti — partie fermée");
    else if (reason) notify("Partie fermée");
    resetToLogin();
  };
  const onPeerLeft = ({ id } = {}) => {
    if (id) webrtc.removePeer(id);
  };
  const onAudioState = (a) => {
    audio.value = a;
  };

  socket.on("connect", onConnect);
  socket.on("disconnect", onDisconnect);
  socket.on("player_list", onPlayerList);
  socket.on("room_info", onRoomInfo);
  socket.on("host_state", onHostState);
  socket.on("your_role", onYourRole);
  socket.on("phase_changed", onPhaseChanged);
  socket.on("role_wake", onRoleWake);
  socket.on("role_sleep", onRoleSleep);
  socket.on("witch_info", onWitchInfo);
  socket.on("inspect_result", onInspectResult);
  socket.on("night_result", onNightResult);
  socket.on("vote_result", onVoteResult);
  socket.on("game_over", onGameOver);
  socket.on("host_left", onHostLeft);
  socket.on("room_closed", onRoomClosed);
  socket.on("peer_left", onPeerLeft);
  socket.on("audio_state", onAudioState);
  socket.on("night_chat", onNightChat);

  // Répercute l'état audio (mic/listen/mute manuel) sur les pistes WebRTC
  watch(
    [audio, selfMuted],
    () => webrtc.applyAudioState({ ...audio.value, selfMuted: selfMuted.value }),
    { deep: true }
  );


  // ---- Helpers ----
  function emit(event, payload = {}) {
    return new Promise((resolve) => {
      socket.emit(event, payload, (res) => {
        if (res && res.ok === false && res.error) notify(res.error);
        resolve(res);
      });
    });
  }

  /** Le micro est OPTIONNEL : s'il échoue (refus, ou page servie en HTTP
   *  non sécurisé depuis un téléphone), on laisse quand même jouer, sans audio. */
  async function ensureMedia() {
    try {
      await webrtc.ensureMic();
      return true;
    } catch (e) {
      notify(
        "🎙️ Audio indisponible (micro refusé / connexion non sécurisée). Tu peux quand même jouer."
      );
      return false;
    }
  }

  function resetToLogin() {
    // Couper l'audio AVANT de vider l'état : sinon les RTCPeerConnection
    // restaient ouvertes et on continuait d'entendre les autres joueurs
    // même après fermeture de la room.
    try { webrtc.destroyAll(); } catch { /* audio déjà coupé */ }
    audio.value = { mic: true, listen: true };
    selfMuted.value = false;
    step.value = "login";
    view.value = "player";
    code.value = "";
    phase.value = "lobby";
    playerList.value = [];
    hostState.value = null;
    roomInfo.value = null;
    myRole.value = null;
    winner.value = null;
    awake.value = false;
    nightMessages.value = [];
    composition.value = null;
    expectedPlayers.value = 0;
  }

  // ---- Actions de navigation ----
  const gotoCreate = () => (step.value = "create");
  const backToLogin = () => resetToLogin();
  function setComposition(comp, total) {
    composition.value = comp;
    expectedPlayers.value = total;
  }

  // ---- Actions de connexion ----
  async function createRoom() {
    await ensureMedia(); // micro optionnel (ex: test depuis un téléphone en HTTP)
    const res = await emit("create_room", {
      name: playerName.value || "MJ",
      composition: composition.value,
    });
    if (res?.ok) {
      code.value = res.code;
      view.value = "host";
      step.value = "lobby";
    }
  }

  async function joinRoom(nameArg, roomCode) {
    if (nameArg) playerName.value = nameArg;
    await ensureMedia(); // micro optionnel (ex: test depuis un téléphone en HTTP)
    const res = await emit("join_room", {
      name: playerName.value || "Joueur",
      code: roomCode,
    });
    if (res?.ok) {
      code.value = res.code;
      view.value = "player";
      step.value = "lobby";
    }
  }

  // ---- Actions du Maître du Jeu ----
  const startGame = () => {
    // Si le nombre de joueurs correspond pile à la composition prévue, on l'envoie.
    // Sinon (partie lancée avec MOINS de joueurs que prévu), on laisse le backend
    // appliquer sa composition par défaut, équilibrée pour ce nombre de joueurs.
    const custom =
      composition.value && expectedPlayers.value === others.value.length
        ? composition.value
        : null;
    return emit("start_game", custom);
  };
  const startNight = () => emit("start_night");
  const startDay = () => emit("start_day");
  const startVote = () => emit("start_vote");
  const resolveVote = () => emit("resolve_vote");
  const nextNightRole = () => emit("next_night_role");
  const wakeRole = (roleId) => emit("wake_role", { roleId });
  const sleepAll = () => emit("sleep_all");
  const toggleMuteAll = () => emit("mute_all", { muted: !(hostState.value?.allMuted) });
  const setMuted = (playerId, muted) => emit("set_muted", { playerId, muted });
  const toggleMutePlayer = (p) => setMuted(p.id, !p.muted);
  const setAlive = (playerId, alive) => emit("set_alive", { playerId, alive });
  const killPlayer = (p) => setAlive(p.id, !p.alive);

  // ---- Actions du joueur ----
  const nightAction = (payload) => emit("night_action", payload);
  const castVote = (targetId) => emit("cast_vote", { targetId });
  /** Chat de nuit : envoyé uniquement aux AUTRES joueurs du rôle réveillé (+ MJ).
   *  Anonyme : on n'affiche que le rôle. Comme le serveur n'émet pas vers
   *  l'expéditeur, on ajoute nous-même notre message localement (marqué "mine"). */
  function sendNightMessage(text) {
    const clean = String(text || "").trim();
    if (!clean) return Promise.resolve({ ok: false });
    return emit("night_chat", { text: clean }).then((res) => {
      if (res?.ok) {
        nightMessages.value.push({
          text: clean,
          roleId: myRole.value?.id || null,
          roleName: myRole.value?.name || "",
          at: Date.now(),
          mine: true,
        });
      }
      return res;
    });
  }
  function toggleSelfMuted() {
    selfMuted.value = !selfMuted.value;
  }

  /** Quitter la room : le serveur nettoie, on coupe l'audio et on revient à l'accueil. */
  async function leaveRoom() {
    try {
      await emit("leave_room");
    } finally {
      resetToLogin();
    }
  }

  /** Le MJ ferme la partie pour tout le monde (fin volontaire). */
  async function closeRoom() {
    try {
      await emit("close_room");
    } finally {
      resetToLogin();
    }
  }

  return {
    // réseau
    socket,
    connected,
    socketId,
    // navigation / partie
    playerName,
    step,
    view,
    code,
    phase,
    playerList,
    hostState,
    roomInfo,
    winner,
    composition,
    expectedPlayers,
    // joueur
    myRole,
    awake,
    inspectResult,
    witchInfo,
    audio,
    selfMuted,
    toast,
    nightMessages,
    // getters
    isNight,
    isGM,
    phaseLabel,
    minPlayers,
    expected,
    others,
    me,
    screen,
    canNightChat,
    // actions
    notify,
    gotoCreate,
    backToLogin,
    setComposition,
    createRoom,
    joinRoom,
    startGame,
    startNight,
    startDay,
    startVote,
    resolveVote,
    nextNightRole,
    wakeRole,
    sleepAll,
    toggleMuteAll,
    setMuted,
    toggleMutePlayer,
    setAlive,
    killPlayer,
    nightAction,
    castVote,
    sendNightMessage,
    toggleSelfMuted,
    leaveRoom,
    closeRoom,
    emit,
  };
});

