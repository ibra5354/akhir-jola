window.__HAJ_TEST = true;
(() => {
  let now = 1000; const q = [];
  performance.now = () => now;
  window.requestAnimationFrame = (cb) => { q.push(cb); return q.length; };
  window.__stats = { frames: 0, fall: 0, stuck: 0, errors: 0, maxCalls: 0, events: [] };
  window.__pump = (n, step = 50) => {
    for (let i = 0; i < n; i++) {
      now += step; const cbs = q.splice(0);
      try { if (window.__bot) window.__bot(step / 1000); } catch (e) { console.error('bot ' + e.message); }
      for (const cb of cbs) cb(now);
      window.__stats.frames++;
      try { if (window.__mon) window.__mon(step / 1000); } catch (e) { console.error('mon ' + e.message); }
    }
    return window.__stats;
  };
})();
