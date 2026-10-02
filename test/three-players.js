/**
 * Vérifie qu'une partie peut démarrer avec le MINIMUM de joueurs (3).
 * Lancer le serveur d'abord : npm start
 * Puis : node test/three-players.js
 */
const { io } = require("socket.io-client");
const URL = process.env.SERVER_URL || "https://localhost:3000";

function connect(name) {
  return new Promise((resolve) => {
    const s = io(URL, { rejectUnauthorized: false });
    s.on("connect", () => resolve(s));
  });
}
const emit = (s, ev, p) => new Promise((r) => s.emit(ev, p, r));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const host = await connect("MJ");
  const p1 = await connect("Alex");
  const p2 = await connect("Sam");
  const p3 = await connect("Jo");

  const comp = { werewolf: 1, seer: 1, villager: 1 }; // 3 joueurs

  const created = await emit(host, "create_room", { name: "MJ", composition: comp });
  console.log("create_room ->", created);

  await emit(p1, "join_room", { code: created.code, name: "Alex" });
  await emit(p2, "join_room", { code: created.code, name: "Sam" });
  console.log("join (2 joueurs) ->", await emit(p3, "join_room", { code: created.code, name: "Jo" }));

  // Test 1 : avec exactement 3 joueurs, la partie doit démarrer
  const started = await emit(host, "start_game", comp);
  console.log("start_game (3 joueurs) ->", started);

  await sleep(300);
  console.log("start_night ->", await emit(host, "start_night", {}));

  process.exit(started && started.ok ? 0 : 1);
})();
