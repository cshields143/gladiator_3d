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

const option_names = [
  'minmapScale',
  'minimapPlayerColor',
  'onkeydown',
  'onkeyup',
  'moveHandler',
  'drawHandler',
  'wallTextureAtlas',
  'wallTextureMapping',
  'floorCeilingTextureAtlas',
  'floorCeilingTextureMapping',
  'textureWidth',
  'textureHeight',
  'ceilingImage',
  'ceilingSolidColor',
  'floorSolidColor',
  'moveRate',
  'screenWidth',
  'screenHeight',
  'screenElementWidth',
  'screenElementHeight',
  'stripWidth',
  'fov',
  'minDistToWall',
  'spriteDrawOffsetX',
  'spriteDrawOffsetY'
];

const option_defaults = [
  10,
  'blue',
  default_onkeydown,
  default_onkeyup,
  () => {},
  () => {},
  '',
  {},
  '',
  {},
  64,
  64,
  undefined,
  'grey',
  'lightgrey',
  30,
  320,
  200,
  320 * 1.5,
  200 * 1.5,
  2,
  60 * Math.PI / 180,
  0.2,
  0.5,
  0.5
];

const Config = class {
  constructor(start = {}) {
    this.bucket = {};
    for (let i = 0, l = option_names.length; i < l; i++) {
      const name = option_names[i];
      const val = option_defaults[i];
      this.store(name, val);
    }
    this.assign(start);
  }
  fetch(k) { return this.bucket[k]; }
  store(k, v) { this.bucket[k] = v; }
  assign(obj) {
    for (let i = 0, l = option_names.length; i < l; i++) {
      const name = option_names[i];
      if (obj[name] !== undefined)
        this.store(name, obj[name]);
    }
  }
};

export { Config };