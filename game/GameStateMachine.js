const { getNightRoles, getRoleById } = require("../config/roles");

/**
 * Cette classe pilote le déroulement nuit/jour d'une Room.
 * Elle ne connaît AUCUN rôle en dur : elle lit juste getNightRoles()
 * depuis config/roles.js. Ajouter/retirer/réordonner un rôle dans ce fichier
 * suffit à changer le déroulement de la nuit, sans toucher à ce fichier-ci.
 */
class GameStateMachine {
  constructor(room) {
    this.room = room;
  }

  /** Démarre la nuit : réinitialise l'index, réveille le premier rôle concerné. */
  startNight() {
    this.room.phase = "night";
    this.room.nightRoleIndex = -1;
    this.room.nightActions = { wolfVotes: new Map(), save: false, poisonTarget: null };
    return this.wakeNextRole();
  }

  /**
   * Réveille le prochain rôle dans l'ordre défini par la config.
   * Ne réveille que les rôles dont au moins un joueur vivant est encore en jeu.
   * Renvoie soit { role, players } soit null si la nuit est terminée.
   */
  wakeNextRole() {
    const nightRoles = getNightRoles();
    const alive = this.room.alivePlayers;

    while (this.room.nightRoleIndex < nightRoles.length - 1) {
      this.room.nightRoleIndex += 1;
      const role = nightRoles[this.room.nightRoleIndex];
      const playersWithRole = alive.filter((p) => p.roleId === role.id);
      if (playersWithRole.length > 0) {
        return { role, players: playersWithRole };
      }
    }
    this.room.nightRoleIndex = nightRoles.length; // plus personne ne peut agir
    return null; // plus aucun rôle à réveiller -> nuit terminée
  }

  /** Victime désignée par les loups (majorité, égalité tirée au hasard). */
  getWolfVictim() {
    const tally = new Map();
    for (const t of this.room.nightActions.wolfVotes.values()) {
      tally.set(t, (tally.get(t) || 0) + 1);
    }
    let best = 0;
    let leaders = [];
    for (const [t, c] of tally) {
      if (c > best) { best = c; leaders = [t]; }
      else if (c === best) leaders.push(t);
    }
    return leaders.length ? leaders[Math.floor(Math.random() * leaders.length)] : null;
  }

  /** Enregistre l'action d'un joueur pendant la nuit (selon role.action de la config). */
  recordNightAction(actorId, payload) {
    const room = this.room;
    const role = getNightRoles()[room.nightRoleIndex];
    const actor = room.players.get(actorId);
    if (room.phase !== "night" || !role || !actor?.alive || actor.roleId !== role.id) {
      return { ok: false, error: "Ce n'est pas ton tour" };
    }
    const target = room.players.get(payload?.targetId);
    const acts = room.nightActions;

    switch (role.action) {
      case "kill":
        if (!target?.alive) return { ok: false, error: "Cible invalide" };
        acts.wolfVotes.set(actorId, payload.targetId);
        return { ok: true };
      case "inspect":
        if (!target?.alive) return { ok: false, error: "Cible invalide" };
        return { ok: true, reveal: { targetId: payload.targetId, roleId: target.roleId } };
      case "witch": {
        if (payload.save && room.witchPotions.save) {
          acts.save = true;
          room.witchPotions.save = false;
        }
        const poisoned = room.players.get(payload.poisonTargetId);
        if (payload.poisonTargetId && room.witchPotions.poison && poisoned?.alive) {
          acts.poisonTarget = payload.poisonTargetId;
          room.witchPotions.poison = false;
        }
        return { ok: true };
      }
      default:
        return { ok: false, error: "Ce rôle n'a pas d'action" };
    }
  }

  /** Applique les actions de la nuit et renvoie la liste des morts. */
  resolveNight() {
    const a = this.room.nightActions;
    const victim = this.getWolfVictim();
    const deadIds = new Set();
    if (victim && !a.save) deadIds.add(victim);
    if (a.poisonTarget) deadIds.add(a.poisonTarget);

    const deaths = [];
    for (const id of deadIds) {
      const p = this.room.eliminatePlayer(id);
      if (p) deaths.push({ id, name: p.name, roleId: p.roleId });
    }
    this.room.nightActions = { wolfVotes: new Map(), save: false, poisonTarget: null };
    return deaths;
  }

  /** Le MJ choisit lui-même quel rôle réveiller. */
  wakeRole(roleId) {
    const nightRoles = getNightRoles();
    const idx = nightRoles.findIndex((r) => r.id === roleId);
    if (idx === -1) return null;
    this.room.nightRoleIndex = idx;
    const role = nightRoles[idx];
    return { role, players: this.room.alivePlayers.filter((p) => p.roleId === role.id) };
  }

  /** Endort tout le monde (aucun rôle réveillé). */
  sleepAll() {
    this.room.nightRoleIndex = getNightRoles().length;
  }

  /** Passe à la phase jour. */
  startDay() {
    this.room.phase = "day";
  }

  /** Ouvre le vote. */
  startVote() {
    this.room.phase = "vote";
    this.room.currentVotes.clear();
  }

  castVote(voterId, targetId) {
    if (this.room.phase !== "vote") return false;
    this.room.currentVotes.set(voterId, targetId);
    return true;
  }

  /** Dépouille le vote et élimine le joueur désigné (selon config/rules.js). */
  resolveVote() {
    const RULES = require("../config/rules");
    const tally = new Map();
    for (const targetId of this.room.currentVotes.values()) {
      if (!targetId) continue; // abstention
      tally.set(targetId, (tally.get(targetId) || 0) + 1);
    }

    let maxVotes = 0;
    let leaders = [];
    for (const [targetId, count] of tally.entries()) {
      if (count > maxVotes) {
        maxVotes = count;
        leaders = [targetId];
      } else if (count === maxVotes) {
        leaders.push(targetId);
      }
    }

    let eliminatedId = null;
    if (leaders.length === 1) {
      eliminatedId = leaders[0];
    } else if (leaders.length > 1 && RULES.voting.tieBreak === "random") {
      eliminatedId = leaders[Math.floor(Math.random() * leaders.length)];
    }
    // sinon (tieBreak === "no_elimination") : personne n'est éliminé

    const eliminatedPlayer = eliminatedId
      ? this.room.eliminatePlayer(eliminatedId)
      : null;

    return { eliminatedId, eliminatedPlayer };
  }
}

module.exports = { GameStateMachine };
