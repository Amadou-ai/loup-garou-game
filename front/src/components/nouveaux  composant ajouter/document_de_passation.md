Document de Passation : Frontend Projet Loup-Garou en Ligne
Ce document résume l'architecture, la stack technique et l'état d'avancement de l'interface frontend du jeu de Loup-Garou. L'interface est fonctionnelle visuellement et simulée en local via Pinia. Le rôle du développeur backend sera d'implémenter la logique serveur (WebSockets/API) et de brancher les données réelles au store existant.

1. Stack Technique Frontend

Framework JS : Vue 3 (Composition API avec ).

Gestionnaire d'état : Pinia (centralisation de la logique métier et des joueurs).

Stylisation : Tailwind CSS v4 (intégré directement via le plugin Vite @tailwindcss/vite, l'import se fait dans style.css via @import "tailwindcss";).

Bundler : Vite.

1. Architecture et Flux Utilisateur

Le système de routing n'utilise pas Vue Router pour le moment, mais un système d'étapes géré dynamiquement dans App.vue (currentStep) :

Phase Création (CreateRoom.vue) : Le Maître du Jeu (MJ) définit la composition du village (nombre de loups, sorcières, etc.).

Phase Lobby (WaitingRoom.vue) : Génération du code de la room. Les joueurs rejoignent, l'interface affiche les slots remplis en temps réel.

Phase Jeu (GameMasterDashboard.vue / PlayerDashboard.vue) : La partie commence. L'interface s'adapte selon si l'utilisateur est le MJ ou un simple joueur.

Note : Une barre de débug temporaire est présente en haut de App.vue pour naviguer librement entre les vues et basculer entre la vue MJ et la vue Joueur.

1. Arborescence des Composants

src/stores/gameStore.js : Le cœur actuel de l'application. Il contient un mock complet de l'état du jeu (cycle jour/nuit, statut global des micros, liste des joueurs, rôle, état de vie, statut mute).

src/components/CreateRoom.vue : Interface de paramétrage des rôles avec compteurs dynamiques. Émet un événement au composant parent avec le nombre total de joueurs.

src/components/WaitingRoom.vue : Salle d'attente. Adapte son affichage selon si on est MJ (bouton "Lancer la partie") ou joueur (message d'attente).

src/components/GameMasterDashboard.vue : Panneau de contrôle global. Gère le cycle jour/nuit, la coupure des micros globale/individuelle et affiche la grille de tous les joueurs.

src/components/PlayerCardGM.vue : Composant enfant de la grille du MJ. Affiche les contrôles (Tuer/Ressusciter, Mute) et intègre une animation 3D matérielle (rotateY) pour révéler le rôle du joueur sans impact sur les performances.

src/components/PlayerDashboard.vue & PlayerCard.vue : Interface épurée du joueur. Centrée sur sa propre carte qu'il peut retourner pour consulter son rôle discrètement.

1. Spécificités Techniques & UI à préserver

Animations 3D des cartes : L'effet de retournement des cartes utilise des propriétés CSS accélérées matériellement (transform: rotateY, preserve-3d, backface-visibility: hidden). Il est crucial de ne pas surcharger ces éléments avec des manipulations DOM complexes pour garder la fluidité.

Ambiance dynamique : Le fond de l'application (dans App.vue) transitionne automatiquement en douceur (transition-colors duration-1000) du gris sombre (jour) au noir profond (nuit) en observant l'état isNight du store Pinia.

Mobile-First : Les tailles des cartes et la grille sont gérées dynamiquement via Tailwind (ex: w-[260px] sm:w-[300px]).

1. Intégration Backend (WebSockets) : Ce qu'il reste à faire

L'interface est prête à être "branchée". Voici les étapes pour finaliser avec le backend :

Remplacer les actions Pinia locales : Les fonctions du gameStore.js (toggleNight, toggleMuteAll, killPlayer) doivent être remplacées par des émissions d'événements WebSocket (ex: socket.emit('toggle_night')).

Écouteurs temps réel : Le store Pinia doit écouter le serveur pour mettre à jour ses variables réactives (isNight, players, etc.). La réactivité de Vue mettra ensuite automatiquement l'UI à jour.

Gestion des connexions / RTC : Câbler la logique des boutons de micro (🎙️/🔇) à une véritable API WebRTC ou un service de chat vocal (comme LiveKit ou Agora) pour que la coupure du son par le MJ soit effective.

Sécurisation des rôles : Actuellement, tous les rôles sont mockés dans le front. Le backend devra s'assurer d'envoyer uniquement les informations nécessaires au client (un joueur ne doit recevoir que son propre rôle, tandis que le MJ reçoit tout le tableau complet).





