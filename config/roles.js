/**
 * CONFIGURATION DES ROLES
 * ------------------------
 * C'est ICI qu'on modifie les règles liées aux rôles, sans toucher au reste du code.
 *
 * Chaque rôle définit :
 *  - id            : identifiant unique (utilisé dans le code)
 *  - name          : nom affiché aux joueurs
 *  - team          : "werewolves" | "villagers" | "solo" (pour calculer la victoire)
 *  - nightOrder    : ordre de réveil pendant la nuit (nombre plus petit = réveillé en premier)
 *                    null = ce rôle n'agit pas la nuit
 *  - wakesTogether : les rôles qui partagent le même groupe de "wakesTogether"
 *                    sont réveillés en même temps (ex: tous les loups)
 *  - action        : "kill" | "inspect" | "witch" | null (type d'action de nuit)
 *  - description   : texte affiché au joueur qui a ce rôle
 *
 * Pour ajouter un rôle : ajoute un objet dans le tableau ROLES.
 * Pour changer l'ordre de la nuit : change juste les valeurs de nightOrder.
 * Pour retirer un rôle du jeu : commente-le ou retire-le du tableau, rien d'autre à changer.
 */

const ROLES = [
  {
    id: "werewolf",
    name: "Loup-Garou",
    team: "werewolves",
    nightOrder: 10,
    action: "kill",
    wakesTogether: "wolves",
    description: "Chaque nuit, désigne une victime avec les autres loups.",
  },
  {
    id: "seer",
    name: "Voyante",
    team: "villagers",
    nightOrder: 20,
    action: "inspect",
    wakesTogether: null,
    description: "Chaque nuit, découvre le rôle d'un joueur de ton choix.",
  },
  {
    id: "witch",
    name: "Sorcière",
    team: "villagers",
    nightOrder: 30,
    action: "witch",
    wakesTogether: null,
    description: "Peut sauver la victime des loups ou empoisonner un joueur (une fois chacune par partie).",
  },
  {
    id: "hunter",
    name: "Chasseur",
    team: "villagers",
    nightOrder: null,
    wakesTogether: null,
    description: "S'il est éliminé, il peut immédiatement éliminer un autre joueur.",
  },
  {
    id: "villager",
    name: "Villageois",
    team: "villagers",
    nightOrder: null,
    wakesTogether: null,
    description: "Aucun pouvoir particulier. Doit démasquer les loups au vote.",
  },
];

/**
 * COMPOSITION PAR DEFAUT SELON LE NOMBRE DE JOUEURS
 * Modifie librement ces répartitions, ou ajoute des tailles de groupe.
 * Le reste (villager) est complété automatiquement par le moteur de jeu.
 */
const DEFAULT_COMPOSITIONS = {
  3: { werewolf: 1, seer: 1 },
  4: { werewolf: 1, seer: 1 },
  5: { werewolf: 1, seer: 1 },
  6: { werewolf: 1, seer: 1, witch: 1 },
  7: { werewolf: 2, seer: 1, witch: 1 },
  8: { werewolf: 2, seer: 1, witch: 1, hunter: 1 },
  9: { werewolf: 2, seer: 1, witch: 1, hunter: 1 },
  10: { werewolf: 3, seer: 1, witch: 1, hunter: 1 },
};

function getRoleById(id) {
  return ROLES.find((r) => r.id === id);
}

/** Retourne les rôles qui agissent la nuit, triés par ordre de réveil. */
function getNightRoles() {
  return ROLES.filter((r) => r.nightOrder !== null).sort(
    (a, b) => a.nightOrder - b.nightOrder
  );
}

module.exports = { ROLES, DEFAULT_COMPOSITIONS, getRoleById, getNightRoles };
