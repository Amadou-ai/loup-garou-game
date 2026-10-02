const { ROLES, DEFAULT_COMPOSITIONS, getRoleById } = require("../config/roles");
const RULES = require("../config/rules");

/** Génère un code de partie court, ex: "K7QX2" */
function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sans I/O/0/1 (ambigus)
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

class Room {
  constructor(hostSocketId) {
    this.code = generateRoomCode();
    this.hostSocketId = hostSocketId;
    this.players = new Map(); // socketId -> { name, roleId, alive, votes }
    this.phase = "lobby"; // lobby | night | day | vote | ended
    this.nightRoleIndex = -1;
    this.currentVotes = new Map(); // voterId -> targetId
    // permet de surcharger la composition par défaut à la création
    this.roleComposition = null;
    this.allMuted = false;
    this.hostName = "MJ";
    // nombre de joueurs attendus (composition choisie par le MJ), pour le lobby
    this.expectedPlayers = 0;
    this.nightActions = { wolfVotes: new Map(), save: false, poisonTarget: null };
    this.witchPotions = { save: true, poison: true }; // persistent toute la partie
  }

  addPlayer(socketId, name) {
    this.players.set(socketId, { name, roleId: null, alive: true, muted: false });
  }

  removePlayer(socketId) {
    this.players.delete(socketId);
  }

  get playerList() {
    return [...this.players.entries()].map(([id, p]) => ({ id, ...p }));
  }

  get alivePlayers() {
    return this.playerList
      .filter((p) => p.alive)
      .map((p) => ({ ...p, team: getRoleById(p.roleId)?.team }));
  }

  /** Distribue les rôles selon la config (ou une composition personnalisée). */
  assignRoles(customComposition = null) {
    const count = this.players.size;
    const composition =
      customComposition || DEFAULT_COMPOSITIONS[count] || DEFAULT_COMPOSITIONS[RULES.minPlayers];

    const roleIds = [];
    for (const [roleId, qty] of Object.entries(composition)) {
      for (let i = 0; i < qty; i++) roleIds.push(roleId);
    }
    // complète avec des villageois jusqu'à atteindre le nombre de joueurs
    while (roleIds.length < count) roleIds.push("villager");

    // mélange (Fisher-Yates)
    for (let i = roleIds.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [roleIds[i], roleIds[j]] = [roleIds[j], roleIds[i]];
    }

    const ids = [...this.players.keys()];
    ids.forEach((socketId, i) => {
      const player = this.players.get(socketId);
      player.roleId = roleIds[i];
      player.alive = true;
    });
  }

  /** Vérifie la condition de victoire via la config des règles. */
  checkWinCondition() {
    return RULES.checkWinCondition(this.alivePlayers);
  }

  eliminatePlayer(socketId) {
    const player = this.players.get(socketId);
    if (player) player.alive = false;
    return player;
  }
}

module.exports = { Room, generateRoomCode };
