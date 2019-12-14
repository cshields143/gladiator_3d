const default_onkeydown = (state, ev) => {
  ev.stopPropagation();
  switch (ev.keyCode) {
    case 37:
      if (ev.ctrlKey || ev.shiftKey)
        state.player.strafe = -1;
      else {
        state.player.dir = -1;
        if (state.player.rotSpeed < state.player.maxRotSpeed)
          state.player.rotSpeed = state.player.deltaRotSpeed(state.player.rotSpeed);
      }
      break;
    case 38:
      state.player.speed = 1;
      break;
    case 39:
      if (ev.ctrlKey || ev.shiftKey)
        state.player.strafe = 1;
      else {
        state.player.dir = 1;
        if (state.player.rotSpeed < state.player.maxRotSpeed)
          state.player.rotSpeed = state.player.deltaRotSpeed(state.player.rotSpeed);
      }
      break;
    case 40:
      state.player.speed = -1;
      break;
  }
};

const default_onkeyup = (state, ev) => {
  ev.stopPropagation();
  switch (ev.keyCode) {
    case 38:
    case 40:
      state.player.speed = 0;
      break;
    case 37:
    case 39:
      state.player.dir = 0;
      state.player.strafe = 0;
      state.player.rotSpeed = state.player.minRotSpeed;
      break;
  }
};

const default_options = {
  minimapScale: 10,
  minimapPlayerColor: 'blue',
  onkeydown: default_onkeydown,
  onkeyup: default_onkeyup,
  moveHandler: () => {},
  drawHandler: () => {},
  wallTextureAtlas: '',
  wallTextureMapping: {},
  floorCeilingTextureAtlas: '',
  floorCeilingTextureMapping: {},
  textureWidth: 64,
  textureHeight: 64,
  ceilingImage: undefined,
  ceilingSolidColor: 'gray',
  floorSolidColor: 'lightgray',
  moveRate: 30,
  screenWidth: 320,
  screenHeight: 200,
  screenElementWidth: 320 * 1.5,
  screenElementHeight: 200 * 1.5,
  stripWidth: 2,
  fov: 60 * Math.PI / 180,
  minDistToWall: 0.2,
  spriteDrawOffsetX: 0.5,
  spriteDrawOffsetY: 0.5
};
const is_opt = k => Object.keys(default_options).includes(k);

const UnknownOptionError = class extends Error {
  constructor(...args) {
    super(...args);
    Error.captureStackTrace(this, UnknownOptionError);
  }
}
const sanity_check = name => {
  if (!is_opt(name))
    throw new UnknownOptionError(name);
  return name;
};

const Config = class {
  constructor(start = {}) {
    this.bucket = {};
    this.assign(default_options, start);
  }
  fetch(k) { return this.bucket[sanity_check(k)]; }
  store(k, v) { this.bucket[sanity_check(k)] = v; }
  assign(...objs) { objs.forEach(obj => Object.entries(obj).forEach(kv => this.store(...kv))); }
};

export { Config };