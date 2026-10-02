/**
 * Gestion des connexions WebRTC en mesh (une par pair) + signaling via le socket.
 * Version "module" (sans hook Vue) pour pouvoir être utilisée depuis le store Pinia,
 * qui vit en dehors d'un composant. Ne connaît rien de l'état du jeu :
 * on lui dit juste "voici la liste des pairs" et "voici mic/listen".
 */
const ICE = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

export function createWebRTC(socket) {
  let stream = null;
  const peers = new Map();
  const pendingIce = new Map();

  async function ensureMic() {
    if (stream) return stream;
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    return stream;
  }

  function createPeer(id) {
    const pc = new RTCPeerConnection(ICE);
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));

    const audioEl = new Audio();
    audioEl.autoplay = true;
    pc.ontrack = (e) => {
      audioEl.srcObject = e.streams[0];
    };
    pc.onicecandidate = (e) => {
      if (e.candidate) socket.emit("webrtc_ice_candidate", { to: id, candidate: e.candidate });
    };

    peers.set(id, { pc, audioEl });
    return peers.get(id);
  }

  async function flushIce(id) {
    const peer = peers.get(id);
    const list = pendingIce.get(id) || [];
    for (const c of list) {
      try {
        await peer.pc.addIceCandidate(c);
      } catch {
        /* candidat obsolète, sans conséquence */
      }
    }
    pendingIce.delete(id);
  }

  const onOffer = async ({ from, offer }) => {
    try {
      await ensureMic();
    } catch {
      return; // pas de micro -> pas d'audio, mais le jeu continue
    }
    const peer = peers.get(from) || createPeer(from);
    await peer.pc.setRemoteDescription(offer);
    await flushIce(from);
    const answer = await peer.pc.createAnswer();
    await peer.pc.setLocalDescription(answer);
    socket.emit("webrtc_answer", { to: from, answer: peer.pc.localDescription });
  };
  const onAnswer = async ({ from, answer }) => {
    const peer = peers.get(from);
    if (!peer) return;
    await peer.pc.setRemoteDescription(answer);
    await flushIce(from);
  };
  const onIce = ({ from, candidate }) => {
    const peer = peers.get(from);
    if (peer && peer.pc.remoteDescription) {
      peer.pc.addIceCandidate(candidate).catch(() => {});
    } else {
      const list = pendingIce.get(from) || [];
      list.push(candidate);
      pendingIce.set(from, list);
    }
  };

  socket.on("webrtc_offer", onOffer);
  socket.on("webrtc_answer", onAnswer);
  socket.on("webrtc_ice_candidate", onIce);

  /** À appeler à chaque nouvelle liste de joueurs : ouvre/ferme les connexions. */
  async function syncPeers(selfId, otherIds) {
    if (!selfId) return;
    try {
      await ensureMic();
    } catch {
      return; // micro refusé : on ne bloque pas le jeu, juste pas d'audio
    }
    for (const [id, peer] of peers) {
      if (!otherIds.includes(id)) {
        peer.pc.close();
        peers.delete(id);
      }
    }
    for (const id of otherIds) {
      if (peers.has(id) || selfId > id) continue;
      const peer = createPeer(id);
      const offer = await peer.pc.createOffer();
      await peer.pc.setLocalDescription(offer);
      socket.emit("webrtc_offer", { to: id, offer: peer.pc.localDescription });
    }
  }

  /** Applique mic/listen renvoyés par le serveur, combinés au mute manuel local. */
  function applyAudioState({ mic, listen, selfMuted }) {
    if (stream) {
      stream.getAudioTracks().forEach((t) => {
        t.enabled = !!mic && !selfMuted;
      });
    }
    peers.forEach((peer) => {
      peer.audioEl.muted = !listen;
    });
  }

  /** Ferme UN pair précis (ex: un joueur a quitté -> on ne l'entend plus). */
  function removePeer(id) {
    const peer = peers.get(id);
    if (!peer) {
      pendingIce.delete(id);
      return;
    }
    try { peer.pc.close(); } catch { /* déjà fermé */ }
    try { peer.audioEl.srcObject = null; } catch { /* ignore */ }
    peers.delete(id);
    pendingIce.delete(id);
  }

  /**
   * Coupe TOUT : ferme toutes les connexions WebRTC et arrête le micro.
   * Appelé quand la room est fermée -> on n'entend plus personne, et
   * personne ne peut plus nous entendre (les pistes micro sont stoppées).
   */
  function destroyAll() {
    for (const id of [...peers.keys()]) removePeer(id);
    if (stream) {
      try {
        stream.getTracks().forEach((t) => {
          try { t.stop(); } catch { /* ignore */ }
        });
      } catch { /* ignore */ }
      stream = null;
    }
  }

  return { ensureMic, syncPeers, applyAudioState, removePeer, destroyAll };
}
