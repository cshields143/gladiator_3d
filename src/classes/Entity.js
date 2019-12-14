import { Mill } from './utility.js';

const Entity = class {
  constructor(start = {}) {
    super({
      x: 2,
      y: 2,
      dir: 0,
      rot: 0,
      rotSpeed: Math.PI / 180,
      speed: 0,
      strafe: 0,
      moveSpeed: 0
    });
    this.assign(start);
  }
};

const Player = class extends Entity {
  constructor(start = {}) {
    super({
      maxRotSpeed: 7 * Math.PI / 180,
      minRotSpeed: 2 * Math.PI / 180,
      deltaRotSpeed: rs => rs * 3,
      crossHairSize: 1,
      crossHairHit: [],
      spriteDistances: {}
    });
    this.assign(start);
  }
};

const Sprite = class extends Entity {
  constructor(start = {}) {
    super({
      isMoving: false,
      drawOnMinimap: false,
      minimapColor: 'red',
      spriteAtlas: '',
      spriteOffsetX: 0,
      spriteOffsetY: 0,
      
    });
    this.assign(start);
  }
};