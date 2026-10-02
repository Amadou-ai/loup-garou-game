/**
 * Métadonnées purement visuelles des rôles (icônes + libellés d'équipe).
 * Les ids correspondent à ceux de config/roles.js côté backend.
 */
export const ROLE_ICONS = {
  werewolf: "🐺",
  seer: "👁️",
  witch: "🧪",
  hunter: "🏹",
  villager: "🌾",
};

export function roleIcon(id) {
  return ROLE_ICONS[id] || "🎭";
}

/** Descriptions (identiques à config/roles.js côté backend), pour la face "rôle". */
export const ROLE_DESCRIPTIONS = {
  werewolf: "Se réveille la nuit pour éliminer une cible avec les autres loups.",
  seer: "Chaque nuit, découvre le rôle d'un joueur de ton choix.",
  witch: "Peut sauver la victime des loups ou empoisonner un joueur (une fois chacune).",
  hunter: "S'il est éliminé, il peut immédiatement éliminer un autre joueur.",
  villager: "Aucun pouvoir particulier. Doit démasquer les loups au vote.",
};

export function roleDescription(id) {
  return ROLE_DESCRIPTIONS[id] || "Rôle inconnu.";
}

export const TEAM_LABEL = {
  werewolves: "Loups-Garous",
  villagers: "Villageois",
  solo: "Solitaires",
};

export function teamLabel(team) {
  return TEAM_LABEL[team] || team || "";
}

/** Catalogue des rôles configurables (visuel de CreateRoom), aligné sur le backend. */
export const CONFIGURABLE_ROLES = [
  { id: "werewolf", name: "Loup-Garou", count: 2 },
  { id: "seer", name: "Voyante", count: 1 },
  { id: "witch", name: "Sorcière", count: 1 },
  { id: "hunter", name: "Chasseur", count: 0 },
  { id: "villager", name: "Simple Villageois", count: 4 },
];
