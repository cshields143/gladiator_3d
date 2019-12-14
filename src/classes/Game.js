import { Player } from './Player.js';
import { Sprite } from './Sprite.js';
import { Mapp } from './Mapp.js';

const Game = class extends Mill {
  constructor(litmap, player_opts = {}) {
    this.mapp = new Mapp(...litmap);
    this.player = new Player(player_opts);
    this.sprites = [];
  }
  get mapWidth() { return this.mapp.width; }
  get mapHeight() { return this.mapp.height; }
  getWallType(x, y) { return this.mapp.fetch(x, y); }
  addSprite(opts = {}) { this.sprites.push(new Sprite(opts)); return this.sprites.length - 1; }
  getSprite(idx) { return this.sprites[idx]; }
  get hasSprites() { return this.sprites.length > 0; }
  get hasOneSprite() { return this.sprites.length === 1; }
  sortSprites(dists, fn) {
    this.sprites.sort((s1, s2) => {
      if (dists[s1.fetch('id')] === undefined)
        dists[s1.fetch('id')] = fn(s1);
      if (dists[s2.fetch('id')] === undefined)
        dists[s2.fetch('id')] = fn(s2);
      return dists[s2.fetch('id')] - dists[s1.fetch('id')];
    });
  }
  updateDists(dists) { this.player.store('spriteDistances', dists); }
  getPlayerCrossHairSize() { return this.player.fetch('crossHairSize'); }
  forEachSprite(fn) { this.sprites.forEach(fn); }
  get playerX() { return this.player.fetch('x'); }
  get playerY() { return this.player.fetch('y'); }
  get playerRot() { return this.player.fetch('rot'); }
};

export { Game };