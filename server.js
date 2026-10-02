const express = require("express");
const http = require("http");
const https = require("https");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { Server } = require("socket.io");

const { Room } = require("./game/Room");
const { GameStateMachine } = require("./game/GameStateMachine");
const RULES = require("./config/rules");
const { getRoleById, getNightRoles } = require("./config/roles");

const app = express();
app.use(express.static("front/dist")); // sert le front Vue buildé (npm run build dans front/)

// HTTPS si des certificats existent. C'est INDISPENSABLE pour que le micro /
// WebRTC fonctionne depuis un autre appareil (getUserMedia exige un contexte
// sécurisé). Génère-les une fois avec : node scripts/make-certs.js
const KEY_PATH = path.join(__dirname, "certs", "server.key");
const CRT_PATH = path.join(__dirname, "certs", "server.crt");
const useHttps = fs.existsSync(KEY_PATH) && fs.existsSync(CRT_PATH);

const server = useHttps
  ? https.createServer({ key: fs.readFileSync(KEY_PATH), cert: fs.readFileSync(CRT_PATH) }, app)
  : http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" }, // à restreindre à ton domaine front en prod
});

// code de room -> { room: Room, engine: GameStateMachine }
const rooms = new Map();

/**
 * Fermeture centralisée d'une room (volontaire ou accidentelle).
 * Garantie : après un close, il ne reste RIEN côté serveur pour les joueurs
 * de cette room — plus d'entrée en mémoire, plus d'appartenance au channel
 * socket.io, donc plus aucun signaling WebRTC possible entre eux.
 */
function closeRoom(code, reason = "closed") {
  const entry = rooms.get(code);
  if (!entry) return false;
  const { room } = entry;
  const memberIds = [room.hostSocketId, ...room.players.keys()].filter(Boolean);

  // 1. Prévenir tout le monde AVANT de sortir les sockets du channel
  io.to(code).emit("room_closed", { reason, code });
  // compat : les anciens clients écoutent encore "host_left"
  if (reason === "host_left") io.to(code).emit("host_left");

  // 2. Sortir chaque socket du channel + oublier la room
  for (const id of memberIds) {
    const s = io.sockets.sockets.get(id);
    if (s) {
      try { s.leave(code); } catch { /* déjà parti */ }
      delete s.data.roomCode;
    }
  }

  // 3. Supprimer toute trace serveur de la room
  rooms.delete(code);
  return true;
}

/** Le signaling WebRTC n'est relayé que si les 2 pairs sont dans la MEME room existante. */
function sameLiveRoom(fromSocket, toId) {
  const code = fromSocket.data.roomCode;
  if (!code || !rooms.has(code)) return false;
  const toSocket = io.sockets.sockets.get(toId);
  return !!toSocket && toSocket.data.roomCode === code;
}

function broadcastPlayerList(code) {
  const { room } = rooms.get(code);
  io.to(code).emit(
    "player_list",
    [{ id: room.hostSocketId, name: room.hostName, alive: true, isHost: true },
      ...room.playerList.map((p) => ({ id: p.id, name: p.name, alive: p.alive }))]
  );
}

function awakeRole(room) {
  const r = getNightRoles()[room.nightRoleIndex];
  return room.phase === "night" && r ? r : null;
}

// Infos publiques du lobby (code, nb de joueurs attendus), utiles à tous
function broadcastRoomInfo(code) {
  const { room } = rooms.get(code);
  io.to(code).emit("room_info", {
    code: room.code,
    hostName: room.hostName,
    expectedPlayers: room.expectedPlayers,
    minPlayers: RULES.minPlayers,
    maxPlayers: RULES.maxPlayers,
    phase: room.phase,
  });
}

// Etat complet envoyé au MJ (il voit tous les rôles)
function pushState(code) {
  const { room, engine } = rooms.get(code);
  const votes = [...room.currentVotes.values()];
  io.to(room.hostSocketId).emit("host_state", {
    phase: room.phase,
    allMuted: room.allMuted,
    minPlayers: RULES.minPlayers,
    awakeRole: awakeRole(room)?.id || null,
    nightRoles: getNightRoles().map((r) => ({ id: r.id, name: r.name })),
    wolfVictim: room.phase === "night" ? engine.getWolfVictim() : null,
    winner: ["lobby", "ready"].includes(room.phase) ? null : room.checkWinCondition(),
    players: room.playerList.map((p) => ({
      id: p.id, name: p.name, alive: p.alive, muted: p.muted,
      roleId: p.roleId, roleName: p.roleId ? getRoleById(p.roleId)?.name : null,
      votes: votes.filter((t) => t === p.id).length,
    })),
  });
}

// Qui peut parler / entendre (appliqué côté client, le serveur ne voit pas l'audio)
function applyAudio(code) {
  const { room } = rooms.get(code);
  const awake = awakeRole(room);
  for (const [id, p] of room.players) {
    let mic, listen;
    if (room.phase === "night") {
      const isAwake = !!awake && p.roleId === awake.id;
      mic = isAwake && p.alive && !p.muted;
      listen = isAwake;
    } else {
      mic = !p.muted && !room.allMuted && (p.alive || RULES.deadPlayersCanSpeak);
      listen = true;
    }
    io.to(id).emit("audio_state", { mic, listen });
  }
}

function refresh(code) {
  if (!rooms.has(code)) return;
  pushState(code);
  applyAudio(code);
  broadcastRoomInfo(code);
}

io.on("connection", (socket) => {
  // après chaque évènement (hors WebRTC), on resynchronise MJ + audio
  socket.onAny((event) => {
    if (event.startsWith("webrtc")) return;
    setImmediate(() => socket.data.roomCode && refresh(socket.data.roomCode));
  });

  // ---- Créer une partie ----
  socket.on("create_room", ({ name, composition }, callback) => {
    const room = new Room(socket.id);
    room.hostName = name;
    // La composition (nb de chaque rôle) est choisie par le MJ avant de créer la room :
    // on en déduit le nombre de joueurs attendus pour le lobby.
    if (composition && typeof composition === "object") {
      room.roleComposition = composition;
      room.expectedPlayers = Object.values(composition).reduce(
        (sum, n) => sum + (Number(n) || 0),
        0
      );
    }
    rooms.set(room.code, { room, engine: new GameStateMachine(room) });

    socket.join(room.code);
    socket.data.roomCode = room.code;
    callback({ ok: true, code: room.code });
    broadcastPlayerList(room.code);
    broadcastRoomInfo(room.code);
  });

  // ---- Rejoindre une partie ----
  socket.on("join_room", ({ code, name }, callback) => {
    const entry = rooms.get(code);
    if (!entry) return callback({ ok: false, error: "Partie introuvable" });
    if (entry.room.phase !== "lobby")
      return callback({ ok: false, error: "La partie a déjà commencé" });
    if (entry.room.players.size >= RULES.maxPlayers)
      return callback({ ok: false, error: "Partie complète" });

    entry.room.addPlayer(socket.id, name);
    socket.join(code);
    socket.data.roomCode = code;
    callback({ ok: true, code });
    broadcastPlayerList(code);
    broadcastRoomInfo(code);
  });

  // ---- Le Maître du Jeu lance la partie ----
  socket.on("start_game", (customComposition, callback) => {
    const entry = getRoomIfHost(socket, callback);
    if (!entry) return;
    const { room } = entry;

    if (room.players.size < RULES.minPlayers) {
      return callback?.({ ok: false, error: `Il faut au moins ${RULES.minPlayers} joueurs` });
    }

    room.assignRoles(customComposition);
    room.phase = "ready";

    // chaque joueur reçoit UNIQUEMENT son propre rôle en privé
    for (const [socketId, player] of room.players.entries()) {
      const role = getRoleById(player.roleId);
      io.to(socketId).emit("your_role", {
        id: role.id,
        name: role.name,
        team: role.team,
        description: role.description,
        action: role.action,
      });
    }

    callback?.({ ok: true });
  });

  // ---- Le Maître du Jeu démarre la nuit ----
  socket.on("start_night", (_data, callback) => {
    const entry = getRoomIfHost(socket, callback);
    if (!entry) return;
    const { room, engine } = entry;

    const wake = engine.startNight();
    io.to(room.code).emit("phase_changed", { phase: "night" });
    if (RULES.manualNight) engine.sleepAll();
    else notifyWake(room, wake);
    callback?.({ ok: true });
  });

  // ---- Le Maître du Jeu passe au rôle suivant de la nuit ----
  socket.on("next_night_role", (_data, callback) => {
    const entry = getRoomIfHost(socket, callback);
    if (!entry) return;
    const { room, engine } = entry;

    // endort les joueurs du rôle précédent
    io.to(room.code).emit("role_sleep");

    const wake = engine.wakeNextRole();
    if (wake) {
      notifyWake(room, wake);
    } else {
      // plus aucun rôle à réveiller -> le MJ peut lancer le jour
      io.to(room.code).emit("night_finished");
    }
    callback?.({ ok: true });
  });

  // ---- Contrôles du Maître du Jeu ----
  socket.on("set_alive", ({ playerId, alive }, cb) => {
    const e = getRoomIfHost(socket, cb);
    if (!e) return;
    const p = e.room.players.get(playerId);
    if (p) p.alive = !!alive;
    broadcastPlayerList(e.room.code);
    cb?.({ ok: true });
  });
  socket.on("set_muted", ({ playerId, muted }, cb) => {
    const e = getRoomIfHost(socket, cb);
    if (!e) return;
    const p = e.room.players.get(playerId);
    if (p) p.muted = !!muted;
    cb?.({ ok: true });
  });
  socket.on("mute_all", ({ muted }, cb) => {
    const e = getRoomIfHost(socket, cb);
    if (!e) return;
    e.room.allMuted = !!muted;
    cb?.({ ok: true });
  });
  socket.on("wake_role", ({ roleId }, cb) => {
    const e = getRoomIfHost(socket, cb);
    if (!e) return;
    if (e.room.phase !== "night") return cb?.({ ok: false, error: "Il faut être de nuit" });
    io.to(e.room.code).emit("role_sleep");
    notifyWake(e.room, e.engine.wakeRole(roleId));
    cb?.({ ok: true });
  });
  socket.on("sleep_all", (_d, cb) => {
    const e = getRoomIfHost(socket, cb);
    if (!e) return;
    e.engine.sleepAll();
    io.to(e.room.code).emit("role_sleep");
    cb?.({ ok: true });
  });

  // ---- Action de nuit d'un joueur (loup, voyante, sorcière...) ----
  socket.on("night_action", (payload, callback) => {
    const entry = rooms.get(socket.data.roomCode);
    if (!entry) return callback?.({ ok: false, error: "Partie introuvable" });
    const result = entry.engine.recordNightAction(socket.id, payload);
    if (result.reveal) {
      // réponse privée à la Voyante uniquement
      socket.emit("inspect_result", {
        targetId: result.reveal.targetId,
        role: getRoleById(result.reveal.roleId).name,
      });
    }
    callback?.({ ok: result.ok, error: result.error });
  });

  // ---- Le Maître du Jeu passe au jour ----
  socket.on("start_day", (_data, callback) => {
    const entry = getRoomIfHost(socket, callback);
    if (!entry) return;
    const { room, engine } = entry;

    const deaths = RULES.autoResolveNight ? engine.resolveNight() : [];
    io.to(room.code).emit("night_result", {
      deaths: deaths.map((d) => ({
        id: d.id,
        name: d.name,
        roleName: RULES.revealRoleOnDeath ? getRoleById(d.roleId)?.name || null : null,
      })),
    });
    broadcastPlayerList(room.code);

    const winner = room.checkWinCondition();
    if (winner) {
      room.phase = "ended";
      io.to(room.code).emit("game_over", { winner });
      return callback?.({ ok: true });
    }

    engine.startDay();
    io.to(room.code).emit("phase_changed", { phase: "day" });
    callback?.({ ok: true });
  });

  // ---- Le Maître du Jeu lance le vote ----
  socket.on("start_vote", (_data, callback) => {
    const entry = getRoomIfHost(socket, callback);
    if (!entry) return;
    const { room, engine } = entry;

    engine.startVote();
    io.to(room.code).emit("phase_changed", { phase: "vote" });
    callback?.({ ok: true });
  });

  // ---- Un joueur vote ----
  socket.on("cast_vote", ({ targetId }, callback) => {
    const code = socket.data.roomCode;
    const entry = rooms.get(code);
    if (!entry) return callback?.({ ok: false, error: "Partie introuvable" });

    const ok = entry.engine.castVote(socket.id, targetId);
    callback?.({ ok });
  });

  // ---- Le Maître du Jeu clôt le vote ----
  socket.on("resolve_vote", (_data, callback) => {
    const entry = getRoomIfHost(socket, callback);
    if (!entry) return;
    const { room, engine } = entry;

    const { eliminatedId, eliminatedPlayer } = engine.resolveVote();
    io.to(room.code).emit("vote_result", {
      eliminatedId,
      eliminatedName: eliminatedPlayer?.name || null,
      eliminatedRole: eliminatedPlayer ? getRoleById(eliminatedPlayer.roleId)?.name || null : null,
    });
    broadcastPlayerList(room.code);

    const winner = room.checkWinCondition();
    if (winner) {
      room.phase = "ended";
      io.to(room.code).emit("game_over", { winner });
    }
    callback?.({ ok: true });
  });

  // ---- Signaling WebRTC (relayé tel quel, le serveur ne touche pas à l'audio) ----
  // Verrouillé : uniquement entre 2 membres de la MEME room encore existante.
  // Après un close, les sockets ont quitté le channel -> plus aucun relais possible.
  socket.on("webrtc_offer", ({ to, offer }) => {
    if (!sameLiveRoom(socket, to)) return;
    io.to(to).emit("webrtc_offer", { from: socket.id, offer });
  });
  socket.on("webrtc_answer", ({ to, answer }) => {
    if (!sameLiveRoom(socket, to)) return;
    io.to(to).emit("webrtc_answer", { from: socket.id, answer });
  });
  socket.on("webrtc_ice_candidate", ({ to, candidate }) => {
    if (!sameLiveRoom(socket, to)) return;
    io.to(to).emit("webrtc_ice_candidate", { from: socket.id, candidate });
  });

  // ---- Fermeture volontaire : le MJ ferme la room / finit la partie ----
  // Après ça, plus RIEN ne reste : les joueurs sont éjectés du channel,
  // leurs pairs WebRTC sont détruits côté client (voir gameStore "room_closed").
  socket.on("close_room", (_data, callback) => {
    const code = socket.data.roomCode;
    if (!code || !rooms.has(code)) return callback?.({ ok: false, error: "Partie introuvable" });
    const { room } = rooms.get(code);
    if (room.hostSocketId !== socket.id) {
      return callback?.({ ok: false, error: "Seul le Maître du Jeu peut faire ça" });
    }
    closeRoom(code, "host_closed");
    callback?.({ ok: true });
  });

  // ---- Un joueur quitte volontairement (bouton "Quitter") ----
  socket.on("leave_room", (_data, callback) => {
    const code = socket.data.roomCode;
    if (!code || !rooms.has(code)) {
      delete socket.data.roomCode;
      return callback?.({ ok: true });
    }
    const { room } = rooms.get(code);
    if (socket.id === room.hostSocketId) {
      // Le MJ part -> toute la room est fermée pour tout le monde
      closeRoom(code, "host_left");
      return callback?.({ ok: true });
    }
    room.removePlayer(socket.id);
    try { socket.leave(code); } catch { /* déjà parti */ }
    delete socket.data.roomCode;
    socket.emit("room_closed", { reason: "you_left", code });
    // Prévenir les autres pour qu'ils ferment la connexion WebRTC vers ce joueur
    io.to(code).emit("peer_left", { id: socket.id });
    if (room.players.size === 0) {
      rooms.delete(code);
    } else {
      broadcastPlayerList(code);
      refresh(code);
    }
    callback?.({ ok: true });
  });

  socket.on("disconnect", () => {
    const code = socket.data.roomCode;
    if (!code || !rooms.has(code)) return;
    const { room } = rooms.get(code);
    if (socket.id === room.hostSocketId) {
      // MJ parti (crash, onglet fermé...) -> fermeture totale, plus rien ne reste
      closeRoom(code, "host_left");
      return;
    }
    room.removePlayer(socket.id);
    // Les autres ferment leur connexion WebRTC vers le joueur parti
    io.to(code).emit("peer_left", { id: socket.id });
    if (room.players.size === 0) {
      rooms.delete(code);
    } else {
      broadcastPlayerList(code);
      refresh(code);
    }
  });

  // ---- Helpers internes ----
  function getRoomIfHost(socket, callback) {
    const code = socket.data.roomCode;
    const entry = rooms.get(code);
    if (!entry) {
      callback?.({ ok: false, error: "Partie introuvable" });
      return null;
    }
    if (entry.room.hostSocketId !== socket.id) {
      callback?.({ ok: false, error: "Seul le Maître du Jeu peut faire ça" });
      return null;
    }
    return entry;
  }

  function notifyWake(room, wake) {
    if (!wake) {
      io.to(room.code).emit("night_finished");
      return;
    }
    const { role, players } = wake;
    // Seuls les joueurs concernés (+ le MJ) sont notifiés du réveil
    for (const p of players) {
      io.to(p.id).emit("role_wake", { roleId: role.id, roleName: role.name });
      if (role.action === "witch") {
        const { engine } = rooms.get(room.code);
        io.to(p.id).emit("witch_info", {
          victimId: engine.getWolfVictim(),
          potions: room.witchPotions,
        });
      }
    }
    io.to(room.hostSocketId).emit("host_role_wake", {
      roleId: role.id,
      roleName: role.name,
      playerIds: players.map((p) => p.id),
    });
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  const proto = useHttps ? "https" : "http";
  console.log(`Serveur Loup-Garou sur ${proto}://localhost:${PORT}`);
  if (!useHttps) {
    console.log("⚠️  HTTP : le micro ne marchera PAS depuis un autre appareil.");
    console.log("    Lance `node scripts/make-certs.js` puis redémarre pour activer HTTPS.");
  } else {
    for (const list of Object.values(os.networkInterfaces())) {
      for (const net of list || []) {
        if (net.family === "IPv4" && !net.internal) {
          console.log(`   -> depuis le téléphone : ${proto}://${net.address}:${PORT}`);
        }
      }
    }
  }
});
