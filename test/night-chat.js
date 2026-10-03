/**
 * Vérifie le chat de nuit : seuls les joueurs du rôle actuellement RÉVEILLÉ
 * peuvent écrire, le message n'est livré qu'aux AUTRES joueurs de ce même rôle
 * (+ le MJ) et il est ANONYME (signé par le RÔLE, jamais par le nom du joueur).
 *
 * Lancer le serveur d'abord : npm start
 * Puis : node test/night-chat.js
 * (si le serveur tourne en HTTP faute de certificats : SERVER_URL=http://localhost:3000 node test/night-chat.js)
 */
const { io } = require("socket.io-client");

const SERVER_URL = process.env.SERVER_URL || "https://localhost:3000";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const emit = (s, ev, p) => new Promise((r) => s.emit(ev, p, r));

function connect(name) {
  return new Promise((resolve) => {
    const s = io(SERVER_URL, { rejectUnauthorized: false });
    s.data = { name, role: null, chats: [] };
    s.on("your_role", (r) => { s.data.role = r.id; });
    s.on("night_chat", (m) => { s.data.chats.push(m); });
    s.on("connect", () => resolve(s));
  });
}

const failures = [];
function assert(cond, label) {
  console.log(`${cond ? "✅" : "❌"} ${label}`);
  if (!cond) failures.push(label);
}

(async () => {
  const host = await connect("MJ");
  const alex = await connect("Alex");
  const sam = await connect("Sam");
  const jo = await connect("Jo");

  const comp = { werewolf: 2, seer: 1 }; // 3 joueurs
  const { code } = await emit(host, "create_room", { name: "MJ", composition: comp });
  console.log("Room créée :", code);
  await emit(alex, "join_room", { code, name: "Alex" });
  await emit(sam, "join_room", { code, name: "Sam" });
  await emit(jo, "join_room", { code, name: "Jo" });

  await emit(host, "start_game", comp);
  await sleep(150);

  const players = [alex, sam, jo];
  const wolves = players.filter((p) => p.data.role === "werewolf");
  const seer = players.find((p) => p.data.role === "seer");
  console.log("Rôles ->", players.map((p) => `${p.data.name}:${p.data.role}`).join(", "));
  assert(wolves.length === 2 && !!seer, "2 loups + 1 voyante distribués");
  if (wolves.length !== 2 || !seer) process.exit(1);

  await emit(host, "start_night", {});
  await sleep(150);

  // 1) Le MJ n'a pas de rôle de nuit : il ne peut pas écrire dans le fil.
  const hostTry = await emit(host, "night_chat", { text: "coucou" });
  assert(hostTry && hostTry.ok === false, "Le MJ (sans rôle) ne peut pas écrire");

  // 2) La voyante n'est pas encore réveillée : refus + aucun message livré.
  const seerTry = await emit(seer, "night_chat", { text: "je parle tout seul" });
  assert(seerTry && seerTry.ok === false, "Un rôle non réveillé ne peut pas parler");

  // Le MJ réveille les loups.
  await emit(host, "wake_role", { roleId: "werewolf" });
  await sleep(150);

  const [w1, w2] = wolves;

  // 3) Message vide -> refus.
  const emptyTry = await emit(w1, "night_chat", { text: "   " });
  assert(emptyTry && emptyTry.ok === false, "Un message vide est refusé");

  // 4) Les deux loups s'écrivent : chacun reçoit l'autre, pas son propre message.
  assert((await emit(w1, "night_chat", { text: "A: je vise le village" })).ok === true,
    "Un loup réveillé peut envoyer un message");
  await emit(w2, "night_chat", { text: "B: ok pour moi" });
  await sleep(150);

  assert(w1.data.chats.some((m) => m.text.startsWith("B:")), "Le loup 1 reçoit le message du loup 2");
  assert(!w1.data.chats.some((m) => m.text.startsWith("A:")), "Le loup 1 ne reçoit pas son propre message (pas de doublon)");
  assert(w2.data.chats.some((m) => m.text.startsWith("A:")), "Le loup 2 reçoit le message du loup 1");
  assert(!w2.data.chats.some((m) => m.text.startsWith("B:")), "Le loup 2 ne reçoit pas son propre message");
  assert(host.data.chats.length === 2, "Le MJ reçoit les deux messages (pour suivre)");
  assert(seer.data.chats.length === 0, "La voyante (mauvais rôle) ne reçoit RIEN");

  // 5) Anonymat : le payload ne contient NI nom NI id de joueur, juste le rôle.
  const all = [...w1.data.chats, ...w2.data.chats, ...host.data.chats];
  assert(all.length > 0 && all.every((m) => m.name === undefined && m.from === undefined),
    "Aucun nom/id de joueur dans le payload (messages anonymes)");
  assert(all.every((m) => m.roleId === "werewolf" && m.roleName === "Loup-Garou"),
    "Chaque message est signé par le rôle (Loup-Garou)");

  // 6) La voyante, réveillée à son tour, écrit sans que les loups ne reçoivent.
  await emit(host, "wake_role", { roleId: "seer" });
  await sleep(150);
  const before = host.data.chats.length;
  assert((await emit(seer, "night_chat", { text: "S: je vois du grabuge" })).ok === true,
    "La voyante réveillée peut écrire");
  await sleep(150);
  assert(!w1.data.chats.some((m) => m.text.startsWith("S:")), "Les loups ne reçoivent PAS le message de la voyante");
  assert(seer.data.chats.every((m) => !m.text.startsWith("S:")), "La voyante ne reçoit pas son propre message en double");
  assert(host.data.chats.length === before + 1, "Le MJ reçoit aussi le murmure de la voyante");

  console.log("");
  if (failures.length) {
    console.log(`❌ ${failures.length} test(s) en échec.`);
    process.exit(1);
  }
  console.log("✅ Tous les tests du chat de nuit sont passés.");
  process.exit(0);
})().catch((err) => {
  console.error("Erreur pendant le test:", err);
  process.exit(1);
});
