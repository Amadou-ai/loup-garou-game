# Document de Passation : Projet Loup-Garou en Ligne

Jeu de Loup-Garou multijoueur temps réel. Un **Maître du Jeu (MJ)** crée une partie et pilote tout (jour/nuit, réveil des rôles, morts, vote, micros) ; chaque **joueur** reçoit uniquement son rôle et agit la nuit. Le projet est **full-stack et fonctionnel** : backend Node/Socket.io + front Vue/Pinia connectés en WebSocket, audio WebRTC filtré par rôle, chat de nuit texte anonyme.

## 1. Stack
- **Backend** : Node.js, Express, Socket.io. HTTPS si `certs/` existe, sinon HTTP.
- **Front** : Vue 3 (`<script setup>`), Pinia, Tailwind CSS v4 (plugin `@tailwindcss/vite`), Vite.
- **Audio** : WebRTC en mesh (un peer par joueur), signaling relayé par Socket.io.
- **État** : le mock Pinia a été remplacé par les events Socket.io (le store ne fait que relayer l'état serveur).

## 2. Lancer
```bash
npm install
node scripts/make-certs.js        # OBLIGATOIRE pour le micro/WebRTC (HTTPS)
cd front && npm install && npm run build && cd ..
npm start                         # https://localhost:3000
```
- Dev front (live-reload) : `cd front && npm run dev` (proxy WS → backend :3000).
- **Après toute modif de `front/src`, refaire `npm run build`** (le backend sert `front/dist`).
- Tests (serveur lancé) : `node test/simulate.js`, `node test/three-players.js`, `node test/night-chat.js`.
- Installer le certificat sur téléphone : voir `README.md`.

## 3. Arborescence
```
server.js                  Express + Socket.io, signaling WebRTC, sert front/dist
game/Room.js               état d'une partie (joueurs, rôles, votes, potions, phase)
game/GameStateMachine.js   déroulement nuit/jour/vote (aucune règle en dur)
config/roles.js            rôles, ordre de réveil, compositions par défaut
config/rules.js            règles globales (min/max joueurs, vote, victoire)
scripts/make-certs.js      génère certs/ (nécessaire au micro hors localhost)
front/src/
  stores/gameStore.js      Socket.io -> état Pinia (phase, joueurs, rôles, audio, chat de nuit)
  composables/webrtc.js    peers WebRTC + audio
  roleMeta.js              icônes / libellés / catalogue des rôles (visuel uniquement)
  App.vue                  aiguillage des écrans
  components/              Lobby, CreateRoom, WaitingRoom, GameMasterDashboard, PlayerCardGM,
                           player/{PlayerDashboard,PlayerCard,NightAction,NightChat,VotePanel}
test/                      simulate.js, three-players.js, night-chat.js
```

## 4. Flux utilisateur
Pas de Vue Router : `App.vue` affiche l'écran selon `game.screen` (dérivé de `step` + `phase`).
`login` (Lobby) → `create` (CreateRoom, composition choisie par le MJ) → `lobby` (WaitingRoom : code de room + joueurs en temps réel) → `game` (GameMasterDashboard si MJ, sinon PlayerDashboard).

## 5. Moteur de jeu & config
Aucune règle en dur dans `game/`. Pour faire évoluer le jeu :
- **`config/roles.js`** : ajouter/retirer un rôle, changer l'ordre de la nuit (`nightOrder`), la composition par défaut (`DEFAULT_COMPOSITIONS`).
- **`config/rules.js`** : `minPlayers`/`maxPlayers`, règles de vote, `checkWinCondition`, `manualNight`, `deadPlayersCanSpeak`…
- Rôles actuels : `werewolf` (nuit, kill), `seer` (nuit, inspect), `witch` (nuit, save/poison), `hunter`, `villager`.

## 6. Fonctionnalités clés
- **MJ** : crée la partie (composition), lance, cycle jour/nuit, réveille **rôle par rôle** (`wake_role`/`next_night_role`/`sleep_all`), coupe les micros (global/individuel), tue/ressuscite, lance/dépouille le vote, ferme la partie.
- **Joueur** : reçoit **uniquement son propre rôle** (`your_role`) ; la nuit il agit selon son rôle (loup = tuer, voyante = inspecter, sorcière = sauver/empoisonner), le jour il vote.
- **Audio** : le serveur envoie `audio_state { mic, listen }` à chaque socket. La nuit, seuls les joueurs du **rôle réveillé** parlent/entendent ; le jour, tout le monde (sauf mute MJ / self-mute).
- **Chat de nuit** : zone de texte visible **uniquement quand le rôle est réveillé** (`phase === 'night' && awake`). Le serveur filtre par rôle réveillé (event `night_chat`) et le message est **anonyme** (signé par le rôle, **jamais** par le nom/id du joueur), livré aux **autres** joueurs du même rôle + au MJ.
- **Anonymat MJ** : le dashboard MJ indique le **rôle** en cours de réveil, mais **pas** quels joueurs sont réveillés.

## 7. Protocole Socket.io
- **Client → serveur** : `create_room`, `join_room`, `start_game`, `start_night`, `next_night_role`, `wake_role`, `sleep_all`, `start_day`, `start_vote`, `cast_vote`, `resolve_vote`, `night_action`, `night_chat`, `set_alive`, `set_muted`, `mute_all`, `leave_room`, `close_room`, `webrtc_offer`/`webrtc_answer`/`webrtc_ice_candidate`.
- **Serveur → client** : `room_info`, `player_list`, `host_state` (MJ), `your_role`, `phase_changed`, `role_wake`/`role_sleep`, `host_role_wake`, `witch_info`, `inspect_result`, `night_result`, `vote_result`, `game_over`, `audio_state`, `night_chat`, `peer_left`, `night_finished`, `room_closed`/`host_left`.
- Sécurité : `your_role` = rôle propre uniquement ; le MJ reçoit tout via `host_state`. Le signaling WebRTC n'est relayé qu'entre 2 sockets d'une même room vivante.

## 8. Points à savoir
- **Rebuild obligatoire** après modif front, sinon `npm start` sert une version obsolète.
- **Certs** : sans `certs/`, le serveur démarre en HTTP → `getUserMedia` KO hors `localhost`.
- **CORS** Socket.io réglé sur `*` → à restreindre en prod.

## 9. UI à préserver
- Cartes 3D (`transform: rotateY`, `preserve-3d`, `backface-visibility: hidden`) : éviter les manipulations DOM lourdes (fluidité).
- Ambiance jour/nuit : le fond de `App.vue` transitionne (`transition-colors duration-1000`) selon `isNight`.
- Mobile-first : tailles / gabarits via Tailwind.

## 10. Reste à faire
- Persistance (optionnelle) pour survivre à un redémarrage du serveur.
- Durcissement prod (CORS, certificats de confiance).
