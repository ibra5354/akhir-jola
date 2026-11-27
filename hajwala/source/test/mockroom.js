(() => {
  const bc = new BroadcastChannel('mockroom');
  const peerId = 'p' + Math.random().toString(36).slice(2, 10);
  const peers = new Map(); let my = {}; const L = [];
  const snap = () => { const a = [{ peer: peerId, by: null, isMe: true, sameTab: true, kind: 'viewer', guest: false, presence: Object.freeze({ ...my }), updatedAt: Date.now() }]; for (const [p, v] of peers) a.push({ peer: p, by: null, isMe: false, sameTab: false, kind: 'viewer', guest: false, presence: v.presence, updatedAt: v.t }); return Object.freeze(a); };
  const fire = (ch) => { const s = snap(); L.forEach(f => f({ peers: s, joined: ch.joined || [], left: ch.left || [], updated: ch.updated || [] })); };
  bc.onmessage = (e) => {
    const m = e.data;
    if (m.type === 'presence') { const isNew = !peers.has(m.peer); peers.set(m.peer, { presence: Object.freeze(m.presence), t: Date.now() }); const p = snap().find(x => x.peer === m.peer); fire(isNew ? { joined: [p] } : { updated: [p] }); }
    if (m.type === 'hello') bc.postMessage({ type: 'presence', peer: peerId, presence: my });
  };
  const room = {
    presence(patch) { for (const k in patch) { if (patch[k] === null) delete my[k]; else my[k] = patch[k]; } bc.postMessage({ type: 'presence', peer: peerId, presence: JSON.parse(JSON.stringify(my)) }); return Promise.resolve(); },
    peers: snap, onPeers(f) { L.push(f); setTimeout(() => f({ peers: snap(), joined: snap(), left: [], updated: [] }), 0); return () => { }; },
    connected: () => true, onConnection(f) { setTimeout(() => f(true), 0); return () => { }; },
    emit() { return Promise.resolve(); }, on() { return () => { }; }, join() { return Promise.reject({ code: 'not_permitted' }); },
  };
  window.claude = { use: async (n) => n === 'room' ? room : n === 'user' ? { me: async () => ({ name: '' }), id: async () => peerId, canEdit: async () => true } : null };
  setTimeout(() => bc.postMessage({ type: 'hello' }), 100);
})();
