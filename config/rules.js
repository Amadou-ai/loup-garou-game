/**
 * REGLES GENERALES DE PARTIE
 * ---------------------------
 * Paramètres globaux à ajuster facilement. Rien ici ne devrait nécessiter
 * de toucher au moteur de jeu (game/GameStateMachine.js).
 */

const RULES = {
  minPlayers: 3, // abaissé à 3 pour pouvoir tester des parties en petit comité
  maxPlayers: 12,

  // Durée par défaut des phases, en secondes. 0 = pas de minuteur automatique
  // (le Maître du Jeu avance manuellement).
  timers: {
    nightRoleAction: 0,
    dayDiscussion: 0,
    vote: 0,
  },

  // Révéler le rôle d'un joueur quand il meurt ?
  revealRoleOnDeath: true,

  deadPlayersCanSpeak: false, // les morts peuvent-ils parler ?
  manualNight: true, // true = le MJ réveille chaque rôle lui-même (boutons)
  autoResolveNight: true, // true = les morts de la nuit sont appliqués au lever du jour

  // Règles du vote
  voting: {
    allowAbstain: true,
    // égalité de votes => "no_elimination" ou "random"
    tieBreak: "no_elimination",
  },

  /**
   * Condition de victoire : appelée après chaque élimination.
   * Reçoit la liste des joueurs vivants (avec leur rôle) et doit renvoyer
   * soit null (partie continue), soit "werewolves" / "villagers" / etc.
   * -> Modifie cette fonction pour changer les conditions de victoire.
   */
  checkWinCondition(alivePlayers) {
    const aliveWolves = alivePlayers.filter((p) => p.team === "werewolves");
    const aliveVillagers = alivePlayers.filter((p) => p.team === "villagers");

    if (aliveWolves.length === 0) return "villagers";
    if (aliveWolves.length >= aliveVillagers.length) return "werewolves";
    return null;
  },
};

module.exports = RULES;
