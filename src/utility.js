const ge = {};
ge.$ = id => document.getElementById(id);
ge.create = tag => document.createElement(tag);
ge.copyObject = (tar, src) => Object.assign(tar, src);
ge.mergeObject = (o1, o2) => {
    for (const attr in o1)
        if(o2[attr] === undefined)
            o2[attr] = o1[attr];
};
ge.cloneObject = o => Object.assign({}, o);
ge.bind = (f, t, ...a) => (...x) => f.apply(t, a.concat(x));

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
    this.tower = {};
    this.check = sanity_check(defs);
    this.assign(defs);
  }
  fetch(k) { return this.tower[this.check(k)]; }
  store(k, v) { this.tower[this.check(k)] = v; }
  assign(...os) { os.forEach(o => Object.entries(o).forEach(kv => this.store(...kv))); }
};

export { ge, Mill };