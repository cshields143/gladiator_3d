const Mill = class {
  constructor(defs) {
    this.bucket = {};
    this.check = k => k;
    this.assign(defs);
  }
  fetch(k) { return this.bucket[this.check(k)]; }
  store(k, v) { this.bucket[this.check(k)] = v; }
  assign(...os) { os.forEach(o => Object.entries(o).forEach(kv => this.store(...kv))); }
};

const EventHandler = class {
  constructor(root, ev, fn) {
    this.root = root;
    this.listening = false;
    this.root.addEventListener(ev, fn);
  }
  turnon() { this.listening = true; }
  turnoff() { this.listening = false; }
};

const iniimg = src => { const i = new Image(); i.src = src; return i; };

const AnimLooper = class {
  constructor(fn) {
    this.id = null;
    this.last = null;
    this.crank = timestamp => {
      this.id = null;
      const res = fn(timestamp, this.last);
      this.last = timestamp;
      if (res) this.id = requestAnimationFrame(ts => this.crank(ts));
    };
  }
  start() { this.id = requestAnimationFrame(ts => this.crank(ts)); }
  stop() { if (this.id !== null) cancelAnimationFrame(this.id); }
};

export { iniimg, Mill, EventHandler, AnimLooper };