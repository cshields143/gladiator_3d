import { Mill } from './utility.js';

const Player = class extends Mill {
  constructor(start = {}) {
    super({
      x: 2,
      y: 2,
      dir: 0,
      rot: 0;
      rotSpeed: Math.PI / 180,
      maxRotSpeed: 7 * Math.PI / 180,
      minRotSpeed: 2 * Math.PI / 180,
      deltaRotSpeed: rotSpeed => rotSpeed * 3,
      speed: 0,
      strafe: 0,
      moveSpeed: 0.21,
      crossHairSize: 1,
      playerCrosshairHit: [],
      spriteDistances: {}
    });
    this.assign(start);
  }
};

export { Player };