/**
 * Simule une partie complète à 5 joueurs pour vérifier que tout le flow
 * (création de room, rôles, nuit, jour, vote, victoire) fonctionne.
 *
 * Lancer le serveur d'abord (dans un autre terminal) :
 *   npm start
 * Puis dans un second terminal :
 *   node test/simulate.js
 */
const { io } = require("socket.io-client");

const SERVER_URL = process.env.SERVER_URL || "https://localhost:3000";
const PLAYER_NAMES = ["Alice", "Bob", "Chris", "Dan", "Eve", "Frank"];

function connectPlayer(name) {
  return new Promise((resolve) => {
    const socket = io(SERVER_URL, { rejectUnauthorized: false });
    socket.on("connect", () => resolve(socket));
    socket.data = { name };

    socket.on("your_role", (role) => {
      console.log(`  [${name}] reçoit son rôle -> ${role.name} (équipe: ${role.team})`);
    });
    socket.on("role_wake", ({ roleName }) => {
      console.log(`  [${name}] est réveillé (${roleName})`);
    });
    socket.on("phase_changed", ({ phase }) => {
      console.log(`  [${name}] voit la phase passer à: ${phase}`);
    });
    socket.on("vote_result", ({ eliminatedName, eliminatedRole }) => {
      console.log(`  [${name}] apprend l'élimination de ${eliminatedName} (${eliminatedRole})`);
    });
    socket.on("game_over", ({ winner }) => {
      console.log(`  [${name}] voit la fin de partie -> vainqueurs: ${winner}`);
    });
    socket.on("webrtc_offer", ({ from, offer }) => {
      console.log(`  [${name}] reçoit une offre WebRTC de ${from} -> ${offer}`);
    });
    socket.on("webrtc_answer", ({ from, answer }) => {
      console.log(`  [${name}] reçoit une réponse WebRTC de ${from} -> ${answer}`);
    });
    socket.on("webrtc_ice_candidate", ({ from, candidate }) => {
      console.log(`  [${name}] reçoit un ICE candidate de ${from} -> ${candidate}`);
    });
  });
}

async function main() {
  console.log("Connexion des joueurs...");
  const sockets = await Promise.all(PLAYER_NAMES.map(connectPlayer));
  const [host, ...others] = sockets;

  console.log("\n--- Création de la partie ---");
  const { code } = await emitAsync(host, "create_room", { name: "Alice" });
  console.log(`Room créée avec le code: ${code}`);

  console.log("\n--- Les autres joueurs rejoignent ---");
  for (let i = 0; i < others.length; i++) {
    const res = await emitAsync(others[i], "join_room", {
      code,
      name: PLAYER_NAMES[i + 1],
    });
    console.log(`${PLAYER_NAMES[i + 1]} rejoint: ${res.ok ? "OK" : res.error}`);
  }

  await sleep(200);

  console.log("\n--- Le MJ lance la partie (distribution des rôles) ---");
  await emitAsync(host, "start_game", null);
  await sleep(200);

  console.log("\n--- Début de la nuit ---");
  await emitAsync(host, "start_night", {});
  await sleep(200);

  // On avance manuellement le MJ à travers tous les rôles de nuit
  for (let i = 0; i < 5; i++) {
    await sleep(200);
    console.log(`\n--- MJ: rôle de nuit suivant (${i + 1}) ---`);
    await emitAsync(host, "next_night_role", {});
  }

  await sleep(200);
  console.log("\n--- Passage au jour ---");
  await emitAsync(host, "start_day", {});

  await sleep(200);
  console.log("\n--- Ouverture du vote ---");
  await emitAsync(host, "start_vote", {});

  await sleep(200);
  console.log("\n--- Tout le monde vote contre Bob ---");
  const bobId = others[0].id;
  for (const s of sockets) {
    if (s.id !== bobId) await emitAsync(s, "cast_vote", { targetId: bobId });
  }

  await sleep(200);
  console.log("\n--- Dépouillement du vote ---");
  await emitAsync(host, "resolve_vote", {});

  console.log("\n--- Test du relais WebRTC (Alice -> Bob) ---");
  const alice = sockets[0];
  const bob = sockets[1];
  alice.emit("webrtc_offer", { to: bob.id, offer: "sdp-offer-fake-test" });
  await sleep(200);
  bob.emit("webrtc_answer", { to: alice.id, answer: "sdp-answer-fake-test" });
  await sleep(200);
  alice.emit("webrtc_ice_candidate", { to: bob.id, candidate: "candidate-fake-test" });
  await sleep(200);

  await sleep(500);
  console.log("\nSimulation terminée. Ctrl+C pour quitter.");
  process.exit(0);
}

function emitAsync(socket, event, payload) {
  return new Promise((resolve) => socket.emit(event, payload, resolve));
}
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

main().catch((err) => {
  console.error("Erreur pendant la simulation:", err);
  process.exit(1);
});
