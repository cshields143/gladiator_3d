import { iniimg, Mill } from './utility.js';

const Sprite = class extends Mill {
    constructor(start = {}) {
        super({
            id: '',
            x: 2,
            y: 2,
            isMoving: false,
            drawOnMinimap: false,
            minimapColor: 'red',
            dir: 0,
            rot: 0,
            rotSpeed: 6 * Math.PI / 180,
            speed: 0,
            strafe: 0,
            moveSpeed: 0.05,
            spriteAtlas: '',
            spriteOffsetX: 0,
            spriteOffsetY: 0,
            spriteWidth: 64,
            spriteHeight: 64,
            spriteScaleX: 1,
            spriteScaleY: 1,
            hitList: [],
            playerCrossHair: null,
            spriteAtlasImage: null
        });
        this.assign(start);
        if (this.fetch('spriteAtlasImage') !== null)
            this.store('spriteAtlasImage', iniimg(this.fetch('spriteAtlasImage')));
    }
};

export { Sprite };