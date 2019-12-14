const ge = {
  $: id => document.getElementById(id),
  create: tag => document.createElement(tag),
  copyObject: (tar, src) => Object.assign(tar, src),
  mergeObject: (o1, o2) => {
      for (const attr in o1)
          if(o2[attr] === undefined)
              o2[attr] = o1[attr];
  },
  cloneObject: o => Object.assign({}, o),
  bind: (f, t, ...a) => (...x) => f.apply(t, a.concat(x))
};

const UnknownError = class extends Error {
  constructor(...args) {
    super(...args);
    Error.captureStackTrace(this, UnknownError);
  }
};
const sanity_check = obj => k => {
  if (!Object.keys(obj).includes(k))
    throw new UnknownError(k);
  return k;
};
const Mill = class {
  constructor(defs) {
    this.bucket = {};
    this.check = sanity_check(defs);
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

export { ge, Mill, EventHandler };