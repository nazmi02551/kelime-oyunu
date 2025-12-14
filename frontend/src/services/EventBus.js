// Simple event bus used for in-app broadcasts
const listeners = {};

const on = (event, cb) => {
  if (!listeners[event]) listeners[event] = [];
  listeners[event].push(cb);
  return () => off(event, cb);
};

const off = (event, cb) => {
  if (!listeners[event]) return;
  listeners[event] = listeners[event].filter(f => f !== cb);
};

const emit = (event, payload) => {
  const cbs = listeners[event] || [];
  for (const cb of cbs) {
    try { cb(payload); } catch (e) { console.warn('EventBus handler error', e); }
  }
};

export default { on, off, emit };
