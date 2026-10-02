# Loup-Garou

Backend Node.js/Socket.io (`server.js`, `game/`, `config/`) + frontend Vue 3 / Pinia / Tailwind CSS v4 (`front/`).

## Lancer le projet

```bash
# 1. Backend
npm install

# 2. Certificats HTTPS (une seule fois) — INDISPENSABLE pour le micro/WebRTC
node scripts/make-certs.js

# 3. Frontend (à chaque modif de front/src)
cd front
npm install
npm run build     # génère front/dist, servi automatiquement par le backend
cd ..

# 4. Démarrer
npm start
```

Ouvre `https://localhost:3000` : un onglet pour le MJ (« Créer »), et un onglet
par joueur (« Rejoindre » avec le code) — au moins 3 joueurs au total
(paramétrable via `config/rules.js` → `minPlayers`).

## Tester depuis un téléphone, micro ouvert (HTTPS)

Le micro (`getUserMedia` / WebRTC) n'est autorisé que sur un **contexte
sécurisé** : `https://` ou `localhost`. Depuis un téléphone, il faut donc du
HTTPS **et** un certificat de confiance.

1. Génère le certificat local (fait à l'étape 2 ci-dessus) :
   ```bash
   node scripts/make-certs.js
   ```
   Il crée `certs/rootCA.crt` (+ `server.key` / `server.crt`).
2. **Installe `certs/rootCA.crt` comme autorité de certification** :
   - **Windows (PC)** : double-clic sur `certs/rootCA.crt` → Installer →
     « Autorités de certification racines de confiance ». (ou en admin :
     `Import-Certificate -FilePath certs\rootCA.crt -CertStoreLocation Cert:\LocalMachine\Root`)
   - **Android** : transfère `rootCA.crt` sur le téléphone → Paramètres →
     Sécurité → Chiffrement et identifiants → Installer un certificat →
     « Certificat d'AC ». Puis **redémarre Chrome**.
   - **iOS** : envoie `rootCA.crt` sur l'iPhone → installe le profil →
     Réglages → Général → Informations → Réglages de confiance des
     certificats → active la confiance totale.
3. `npm start` puis, sur le téléphone (même Wi-Fi), ouvre l'URL affichée au
   démarrage, par ex. **`https://192.168.1.66:3000`** (⚠️ pas `localhost`).

> Sans installation du certificat, le navigateur affiche un avertissement et le
> micro peut rester bloqué. Le jeu reste jouable sans micro (le store le rend
> optionnel), mais il n'y aura pas d'audio.

## Développer le front avec live-reload

Dans un terminal, lance le backend (`npm start`, port 3000).
Dans un second terminal :
```bash
cd front
npm run dev
```
Ouvre l'URL indiquée par Vite (en général `http://localhost:5173`) : les
changements dans `front/src/` s'appliquent instantanément. Le proxy défini
dans `front/vite.config.js` redirige les WebSocket vers le backend.
N'oublie pas `npm run build` dans `front/` une fois content du résultat,
pour que `npm start` serve la version à jour.

## Organisation du front

```
front/src/
  stores/gameStore.js     cœur de l'appli : Socket.io -> état Pinia (rôles, phase, joueurs)
  composables/webrtc.js   peers WebRTC + audio (isolé, ne dépend pas du jeu)
  roleMeta.js             icônes / libellés d'équipe des rôles
  App.vue                 aiguille Lobby / CreateRoom / WaitingRoom / dashboards
  components/
    Lobby.vue             écran d'accueil (prénom, créer / rejoindre)
    CreateRoom.vue        configuration des rôles par le MJ
    WaitingRoom.vue       lobby temps réel (code + joueurs)
    GameMasterDashboard.vue   vue MJ (jour/nuit, mute, grille des joueurs)
    PlayerCardGM.vue          carte joueur côté MJ (3D flip + kill/mute)
    player/
      PlayerDashboard.vue  vue joueur
      PlayerCard.vue       carte de rôle du joueur (3D flip)
      NightAction.vue      actions de nuit (loup, voyante, sorcière)
      VotePanel.vue        vote du village
```

## Modifier les règles (sans toucher au moteur de jeu)

- **`config/roles.js`** : liste des rôles, leur ordre de réveil la nuit,
  et la composition par défaut selon le nombre de joueurs.
  → Ajouter/retirer un rôle, changer l'ordre de la nuit = modifier UNIQUEMENT ce fichier.
- **`config/rules.js`** : nombre min/max de joueurs, règles de vote (égalité...),
  condition de victoire.
  → Changer qui gagne, comment on gère les égalités au vote = modifier UNIQUEMENT ce fichier.

Le moteur de jeu (`game/GameStateMachine.js`, `game/Room.js`) ne contient
aucune règle en dur : il lit ces deux fichiers de config. C'est fait exprès
pour que tu puisses itérer sur l'équilibrage sans risquer de casser la logique.

## Tester sans frontend

Tu peux écrire un petit script client Node avec `socket.io-client` pour simuler
plusieurs joueurs, avant même d'avoir un frontend :

```js
const { io } = require("socket.io-client");
const socket = io("http://localhost:3000");
socket.emit("create_room", { name: "Alice" }, (res) => console.log(res));
```

## Ce qui manque encore (prochaines étapes)

- Persistance (optionnelle) si tu veux garder des parties après un redémarrage serveur.
- Le frontend consomme désormais ces events Socket.io via le store Pinia (`front/src/stores/gameStore.js`).
- Le WebRTC côté client (le serveur ne fait que relayer le signaling,
  voir les events `webrtc_offer` / `webrtc_answer` / `webrtc_ice_candidate`).
