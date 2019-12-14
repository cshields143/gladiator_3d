import { iniimg, EventHandler, AnimLooper } from './classes/utility.js';
import { Config } from './classes/Config.js';
import { Player } from './classes/Player.js';
import { Sprite } from './classes/Sprite.js';

const gettime = () => (new Date()).getTime();
const fov_floor_weight_table = {
    10: 5.5,
    20: 2.8,
    30: 1.85,
    40: 1.35,
    45: 1.15,
    50: 1,
    55: 0.95,
    60: 0.85,
    65: 0.75,
    70: 0.65,
    75: 0.6,
    80: 0.55,
    85: 0.5,
    90: 0.45,
    95: 0.4,
    100: 0.35,
    110: 0.3,
    120: 0.25,
    130: 0.2,
    140: 0.15,
    150: 0.12,
    160: 0.08,
    170: 0.03
};

const Main = class {
    constructor(litmap, root, screen_el, minimap_el, options = {}, player_opts = {}) {
        this.running = true;
        this.root = root;
        this.mover = new AnimLooper((now, then) => {
            this.move(then === null ? 0 : now - then);
            return this.running;
        });
        this.drawer = new AnimLooper(() => {
            this._ctx.clearRect(0, 0, this._screen.width, this._screen.height);
            this.updateMiniMap();
            this.drawSimpleCeilingAndGround();
            this.castRays();
            return this.running;
        });
        this._state = new Game(litmap, player_opts);
        this._screen = screen_el;
        this._ctx = this._screen.getContext('2d');
        this._minimap = minimap_el;
        this._options = new Config(options);
        this._wallTextureAtlas = iniImg(this._options.fetch('wallTextureAtlas'));
        this._floorCeilingTextureAtlas = iniimg(this._options.fetch('floorCeilingTextureAtlas'));
        if (this._options.fetch('ceilingImage'))
            this._skyImage = iniimg(this._options.fetch('ceilingImage'));
        this._screen.width = this._options.fetch('screenWidth');
        this._screen.height = this._options.fetch('screenHeight');
        this._screen.style.width = this._options.fetch('screenElementWidth') + 'px';
        this._screen.style.height = this._options.fetch('screenElementHeight') + 'px';
        this._numRays = Math.ceil(this._options.fetch('screenWidth') / this._options.fetch('stripWidth'));
        this._halfFov = this._options.fetch('fov') / 2;
        this._fovFloorWeight = 0.85 + 5;
        this._screenMiddle = this._options.fetch('screenWidth') / 2;
        this._lastMoveCycleTime = undefined;
        let match = 999;
        let fov_degrees = 180 * this._options.fetch('fov') / Math.PI;
        for (let fov_key in fov_floor_weight_table) {
            const new_match = Math.abs(fov_key - fov_degrees);
            if (new_match < match) {
                this._fovFloorWeight = fov_floor_weight_table[fov_key];
                match = new_match;
            }
            if (match === 0) break;
        }
        this._viewDist = this._screenMiddle / Math.tan(this._halfFov);
        this._eventHandlers = [
            new EventHandler(root, 'keydown',
                this._options.fetch('onkeydown').bind(this, this._state)),
            new EventHandler(root, 'keyup',
                this._options.fetch('onkeyup').bind(this, this._state))
        ];
        this.registerEventHandlers();
    }
    registerEventHandlers() { this._eventHandlers.forEach(eh => eh.turnon()); }
    deRegisterEventHandlers() { this._eventHandlers.forEach(eh => eh.turnoff()); }
    start() {
        this.running = true;
        this.registerEventHandlers();
        this.drawMiniMap();
        this.drawer.start();
        this.mover.start();
    }
    stop() {
        this.running = false;
        this.deRegisterEventHandlers();
        this.drawer.stop();
        this.mover.stop();
    }
    move(timeDelta) {
        const player = this._state.player;
        const timeCorrection = timeDelta / this._options.fetch('moveRate');
        if (isNaN(timeCorrection)) timeCorrection = 1;
        this.moveEntity(timeCorrection, player);
        this._state.forEachSprite(spr => {
            if (spr.fetch('isMoving'))
                this.moveEntity(timeCorrection, spr);
        });
    }
    moveEntity(timeCorrection, entity) {
        const moveStep = timeCorrection * entity.fetch('speed') * entity.fetch('moveSpeed');
        const strafeStep = timeCorrection * entity.fetch('strafe') * entity.fetch('moveSpeed');
        let newX = entity.fetch('x') + Math.cos(entity.fetch('rot')) * moveStep;
        let newY = entity.fetch('y') + Math.sin(entity.fetch('rot')) * moveStep;
        newX -= Math.sin(entity.fetch('rot')) * strafeStep;
        newY += Math.cos(entity.fetch('rot')) * strafeStep;
        entity.store('rot', entity.fetch('rot') +
            timeCorrection * entity.fetch('dir') * entity.fetch('rotSpeed'));
        const c = this.detectCollision(newX, newY, entity);
        if (!c[0]) entity.store('x', newX);
        if (!c[1]) entity.store('y', newY);
    }
    detectCollision(x, y, entity) {
        const getMapEntry = (x, y) => {
            if (entity.fetch('id')) {
                x -= this._options.fetch('spriteDrawOffsetX');
                y -= this._options.fetch('spriteDrawOffsetY');
            }
            return this._state.getWallType(Math.floor(x), Math.floor(y));
        };
        if (x < 0 || x > this._state.mapWidth || y < 0 || y > this._state.mapHeight)
            return [true, true];
        const distToWall = this._options.fetch('minDistToWall');
        let collisionX = false;
        let collisionY = false;
        if (getMapEntry(x, y + distToWall) > 0) collisionY = true;
        else if (getMapEntry(x, y - distToWall) > 0) collisionY = true;
        if (getMapEntry(x + distToWall, y) > 0) collisionX = true;
        else if (getMapEntry(x - distToWall, y) > 0) collisionX = true;
        return [collisionX, collisionY];
    }
    drawSimpleCeilingAndGround() {
        const ctx = this._ctx;
        const screenHeight = this._options.fetch('screenHeight');
        const screenHeightHalf = this._options.fetch('screenHeight') / 2;
        const screenWidth = this._options.fetch('screenWidth');
        if (this._skyImage)
            this.circleImage(this._skyImage);
        else {
            ctx.fillStyle = this._options.fetch('ceilingSolidColor');
            ctx.fillRect(0, 0, screenWidth, screenHeightHalf);
        }
        ctx.fillStyle = this._options.fetch('floorSolidColor');
        ctx.fillRect(0, screenHeightHalf, screenWidth, screenHeightHalf);
    }
    drawMiniMap() {
        const minimapScale = this._options.fetch('minimapScale');
        const mapWidth = this._state.mapWidth;
        const mapHeight = this._state.mapHeight;
        if (this._minimapWalls === undefined) {
            this._minimapWalls = this.root.createElement('canvas');
            this._minimapWalls.style.position = 'absolute';
            this._minimapWalls.style.zIndex = 0;
            this._minimap.appendChild(this._minimapWalls);
        }
        const minimapWalls = this._minimapWalls;
        minimapWalls.width = mapWidth * minimapScale;
        minimapWalls.height = mapHeight * minimapScale;
        minimapWalls.style.width = `${mapWidth * minimapScale}px`;
        minimapWalls.style.height = `${mapHeight * minimapScale}px`;
        const ctx = minimapWalls.getContext('2d');
        for (let y = 0; y < mapHeight; y++) {
            for (let x = 0; x < mapWidth; x++) {
                const wall = this._state.getWallType(x, y);
                if (wall > 0) {
                    ctx.fillStyle = 'rgb(200,200,200)';
                    ctx.fillRect(x * minimapScale, y * minimapScale, minimapScale, minimapScale);
                }
            }
        }
    }
    updateMiniMap() {
        if (this._minimapWalls === undefined) this.drawMiniMap();
        const player = this._state.player;
        const options = this._options;
        const minimapScale = options.fetch('minimapScale');
        const mapWidth = this._state.mapWidth;
        const mapHeight = this._state.mapHeight;
        if (this._minimapObjects === undefined) {
            this._minimapObjects = this.root.createElement('canvas');
            this._minimapObjects.style.position = 'aboslute';
            this._minimapObjects.style.zIndex = 1;
            this._minimap.appendChild(this._minimapObjects);
        }
        const minimapObjects = this._minimapObjects;
        minimapObjects.width = mapWidth * minimapScale;
        minimapObjects.height = mapHeight * minimapScale;
        minimapObjects.style.width = `${mapWidth * minimapScale}px`;
        minimapObjects.style.height = `${mapHeight * minimapScale}px`;
        const ctx = minimapObjects.getContext('2d');
        ctx.fillStyle = options.fetch('minimapPlayerColor');
        ctx.fillRect(
            player.fetch('x') * minimapScale - 2,
            player.fetch('y') * minimapScale - 2,
            4, 4
        );
        ctx.strokeStyle = options.fetch('minimapPlayerColor');
        ctx.beginPath();
        ctx.moveTo(player.fetch('x') * minimapScale, player.fetch('y') * minimapScale);
        ctx.lineTo(
            (player.fetch('x') + Math.cos(player.fetch('rot'))) * minimapScale,
            (player.fetch('y') + Math.sin(player.fetch('rot'))) * minimapScale
        );
        ctx.closePath();
        ctx.stroke();
    }
    castRays() {
        const viewDistSquare = this._viewDist * this._viewDist;
        const leftmostRayPos = -this._numRays / 2;
        const distArray = [];
        for (let i = 0; i < this._numRays; i++) {
            const rayScreenPos = (leftmostRayPos + i) * this._options.fetch('stripWidth');
            const rayViewLength = Math.sqrt(rayScreenPos * rayScreenPos + viewDistSquare);
            let rayAngle = Math.asin(rayScreenPos / rayViewLength);
            rayAngle = this._state.player.fetch('rot') + rayAngle;
            rayAngle %= Math.PI * 2;
            if (rayAngle < 0) rayAngle += Math.PI * 2;
            const res = this.castSingleRay(rayAngle, i);
            const dist = res[0] * Math.cos(this._state.player.fetch('rot') - rayAngle);
            distArray.push(dist);
            this.drawStrip(i, dist, res[1], res[2], res[3], res[4], rayAngle);
        }
        if (!this._state.hasSprites) return;
        const spriteOffsetX = this._options.fetch('spriteDrawOffsetX');
        const spriteOffsetY = this._options.fetch('spriteDrawOffsetY');
        const sprite_dists = {};
        const getDistanceToPlayer = (sprite => {
            const sdx = sprite.fetch('x') - this._state.player.fetch('x') - spriteOffsetX;
            const sdy = sprite.fetch('y') - this._state.player.fetch('y') - spriteOffsetY;
            return Math.sqrt(sdx * sdx + sdy * sdy);
        }).bind(this);
        if (this._state.hasOneSprite) {
            const sprite = this._state.getSprite(0);
            sprite_dists[sprite.fetch('id')] = getDistanceToPlayer(sprite);
        } else
            this._state.sortSprites(sprite_dists, getDistanceToPlayer);
        this._state.updateDists(sprite_dists);
        const crossHairSize = this._state.getPlayerCrossHairSize();
        const screenMiddle = this._screenMiddle;
        const playerCrosshairHit = [];
        this._state.forEachSprite((spr, i) => {
            const dist = sprite_dists[spr.fetch('id')];
            let xSprite = spr.fetch('x') - spriteOffsetX;
            let ySprite = spr.fetch('y') - spriteOffsetY;
            if (this._minimapObjects && spr.fetch('drawOnMinimap')) {
                const ctx = this._minimapObjects.getContext('2d');
                ctx.fillStyle = spr.fetch('minimapColor');
                ctx.fillRect(
                    xSprite * this._options.fetch('minimapScale'),
                    ySprite * this._options.fetch('minimapScale'),
                    4, 4
                );
            }
            xSprite -= this._state.playerX;
            ySprite -= this._state.playerY;
            const spriteAngle = Math.atan2(ySprite, xSprite) - this._state.playerRot;
            const size = this._viewDist / (Math.cos(spriteAngle) * dist);
            if (size <= 0) continue;
            let x = Math.floor(this._options.fetch('screenWidth') / 2 + Math.tan(spriteAngle) *
                this._viewDist - size * spr.fetch('spriteScaleX'));
            let y = Math.floor(this._options.fetch('screenHeight') / 2 -
                (0.55 + spr.fetch('spriteScaleY') - 1) * size);
            const sx = Math.floor(size * spr.fetch('spriteScaleX'));
            const sy = Math.ceil(spr.fetch('spriteHeight') * 0.01 * size) +
                (0.45 + spr.fetch('spriteScaleY') - 1) * size;
            const drawSprite = (tx, tw, sx, sw) => {
                if (tw <= 0 || sw <= 0) return;
                this._ctx.drawImage(spr.fetch('spriteAtlasImage'), tx,
                    spr.fetch('spriteOffsetY'), tw, spr.fetch('spriteHeight'), sx, y, sw, sy);
                if (sx <= screenMiddle + crossHairSize - 1 &&
                    sx + sw >= screenMiddle - crossHairSize + 1) {
                        spr.store('playerCrossHair', (screenMiddle - sx) * tw / sw);
                        playerCrosshairHit.push(spr);
                }
            };
            const tx = spr.fetch('spriteOffsetX');
            const ts = spr.fetch('spriteWidth');
            let cumDS = 0;
            let cumTS = 0;
            const strips = sx / this._options.fetch('stripWidth');
            let drawing = false;
            let execute_draw = false;
            spr.store('hitList', []);
            for (let i = 0; i < strips; i++) {
                cumDS += this._options.fetch('stripWidth');
                cumTS += Math.floor(cumDS * spr.fetch('spriteWidth') / sx);
                cumTS = cumTS > spr.fetch('spriteWidth') ? spr.fetch('spriteWidth') : cumTS;
                const distIndex = Math.floor((x + cumDS) *
                    distArray.length / this._options.fetch('screenWidth'));
                const distWall = distArray[distIndex];
                const distDelta = distWall - dist;
                if (distWall === undefined || distDelta < -0.1 * dist) {
                    if (drawing) execute_draw = true;
                    drawing = false;
                } else {
                    if (!drawing) {
                        drawing = true;
                        x += cumDS;
                        tx += cumTS;
                        cumDS = 0;
                        cumTS = 0;
                    }
                }
                if (execute_draw) {
                    drawSprite(tx, cumTS, x, cumDS);
                    spr.fetch('hitList').push([tx, cumTS, x, cumDS]);
                    execute_draw = false;
                    drawing = false;
                } else if (i + 1 >= strips && drawing) {
                    drawSprite(tx, cumTS, x, cumDS);
                    spr.fetch('hitList').push([tx, cumTS, x, cumDS]);
                    break;
                }
            }
        });
        this._state.player.store('playerCrosshairHit', playerCrosshairHit);
    }
    castSingleRay(rayAngle, stripIdx) {
        const right = (rayAngle > Math.PI * 1.5 ||
                       rayAngle < Math.PI * 0.5);
        const up = (rayAngle < 0 || rayAngle > Math.PI);
        const v_x = Math.cos(rayAngle);
        const v_y = Math.sin(rayAngle);
        const slope_v = v_y / v_x;
        const dx_v = right ? 1 : -1;
        const dy_v = dx_v * slope_v;
        let x_v = right ? Math.ceil(this._state.playerX) : Math.floor(this._state.playerX);
        let y_v = this._state.playerY + (x_v - this._state.playerX) * slope_v;
        let do_v = true;
        let dist_v = -1;
        let xHit_v = 0;
        let yHit_v = 0;
        let wallType_v = 0;
        const slope_h = v_x / v_y;
        const dy_h = up ? -1 : 1;
        const dx_h = dy_h * slope_h;
        let y_h = up ? Math.floor(this._state.playerY) : Math.ceil(this._state.playerY);
        let x_h = this._state.playerX + (y_h - this._state.playerY) * slope_h;
        let do_h = true;
        let dist_h = -1;
        let xHit_h = 0;
        let yHit_h = 0;
        let wallType_h = 0;
        let distx, disty, wallx_v, wally_v, texturex_v, wallx_h, wally_h, texturex_h;
        while (do_h || do_v) {
            do_h = do_h ? (x_h >= 0 && x_h < this._state.mapWidth &&
                           y_h >= 0 && y_h < this._state.mapHeight) : false;
            do_v = do_v ? (x_v >= 0 && x_v < this._state.mapWidth &&
                           y_v >= 0 && y_v < this._state.mapHeight) : false;
            if (do_v) {
                wallx_v = Math.floor(x_v + (right ? 0 : -1));
                wally_v = Math.floor(y_v);
                wallType_v = this._state.getWallType(wallx_v, wally_v);
                if (wallType_v) {
                    distx = x_v - this._state.playerX;
                    disty = y_v - this._state.playerY;
                    dist_v = distx * distx + disty * disty;
                    xHit_v = x_v;
                    yHit_v = y_v;
                    texturex_v = y_v % 1;
                    if (!right) texturex_v = 1 - texturex_v;
                    do_v = false;
                }
                x_v += dx_v;
                y_v += dy_v;
            }
            if (do_h) {
                wally_h = Math.floor(y_h + (up ? -1 : 0));
                wally_h = wally_h < 0 ? 0 : wally_h;
                wallx_h = Math.floor(x_h);
                wallType_h = this._state.getWallType(wallx_h, wally_h);
                if (wallType_h) {
                    distx = x_h - this._state.playerX;
                    disty = y_h - this._state.playerY;
                    dist_h = distx * distx + disty * disty;
                    xHit_h = x_h;
                    yHit_h = y_h;
                    texturex_h = x_h % 1;
                    if (up) texturex_h = 1 - texturex_h;
                    do_h = false;
                }
                x_h += dx_h;
                y_h += dy_h;
            }
        }
        if (dist_h !== -1 && (dist_v === -1 || dist_v > dist_h))
            return [Math.sqrt(dist_h), texturex_h, wallType_h, xHit_h, yHit_h];
        return [Math.sqrt(dist_v), texturex_v, wallType_v, xHit_v, yHit_v];
    }
    drawStrip(index, dist, texturex, wallType, hitX, hitY, rayAngle) {
        const textureWidth = this._options.fetch('textureWidth');
        const textureHeight = this._options.fetch('textureHeight');
        const screenHeight = this._options.fetch('screenHeight');
        const stripWidth = this._options.fetch('stripWidth');
        const ctx = this._ctx;
        const textureOffset = this._options.fetch('wallTextureMapping')[wallType];
        const textureOffset_h = textureOffset ? textureOffset[0] : 0;
        const textureOffset_v = textureOffset ? textureOffset[1] : 0;
        const height = Math.round(this._viewDist / dist);
        const x = index * stripWidth;
        const y = Math.round((screenHeight - height) / 2);
        ctx.drawImage(
            this._wallTextureAtlas,
            Math.floor(textureOffset_h + texturex * textureWidth),
            textureOffset_v,
            1,
            textureHeight,
            x,
            y,
            stripWidth,
            height
        );
        const fheight = (screenHeight - height) / 2;
        const foffset = y + height;
        const fweight = (this._options.fetch('screenWidth') / screenHeight) * this._fovFloorWeight;
        const vx = (hitX - this._state.playerX) / dist;
        const vy = (hitY - this._state.playerY) / dist;
        const bottom = foffset + fheight;
        for (let fy = 0; fy < fheight; fy++) {
            const currentDist = bottom / (2 * (fy + foffset) - bottom);
            const wx = this._state.playerX + vx * currentDist * fweight;
            const wy = this._state.playerY + vy * currentDist * fweight;
            const mx = Math.floor(wx);
            const my = Math.floor(wy);
            const floorType = this._state.getWallType(mx, my);
            const floorTexturex = (wx * textureWidth) % textureWidth;
            const floorTexturey = (wy * textureHeight) % textureHeight;
            if (floorType > 0) continue;
            textureOffset = this._options.fetch('floorCeilingTextureMapping')[floorType];
            const textureOffset_floor_h = textureOffset ? textureOffset[0][0] : 0;
            const textureOffset_floor_v = textureOffset ? textureOffset[0][1] : 0;
            const textureOffset_ceiling_h = textureOffset ? textureOffset[1][0] : 0;
            const textureOffset_ceiling_v = textureOffset ? textureOffset[1][1] : 0;
            ctx.drawImage(
                this._floorCeilingTextureAtlas,
                floorTexturex + textureOffset_floor_h,
                floorTexturey + textureOffset_floor_v,
                1, 1, x, fy + foffset, stripWidth, 1
            );
            const ct = fheight - fy;
            ctx.drawImage(
                this._floorCeilingTextureAtlas,
                floorTexturex + textureOffset_ceiling_h,
                floorTexturey + textureOffset_ceiling_v,
                1, 1, x, ct, stripWidth * 2, 1
            );
        }
    }
    circleImage(img) {
        let skyWidth = this._options.fetch('screenWidth');
        let leftOverWidth = 0;
        const ctx = this._ctx;
        const screenHeight = this._options.fetch('screenHeight');
        const screenWidth = this._options.fetch('screenWidth');
        let xoffset = this._state.playerRot;
        xoffset %= Math.PI * 2;
        if (xoffset < 0) xoffset += Math.PI * 2;
        let rot = xoffset * (img.width / (Math.PI * 2));
        if (rot + skyWidth > img.width) {
            leftOverWidth = rot + skyWidth - img.width;
            skyWidth -= leftOverWidth;
        }
        if (skyWidth)
            ctx.drawImage(img, rot, 0, skyWidth, screenHeight / 2, 0, 0, skyWidth, screenHeight / 2);
        if (leftOverWidth)
            ctx.drawImage(img, 0, 0, leftOverWidth, screenHeight / 2, skyWidth - 1, 0, leftOverWidth, screenHeight / 2);
    }
    drawRay(rayX, rayY) {
        const minimapObjects = this._minimapObjects;
        const ctx = minimapObjects.getContext('2d');
        ctx.strokeStyle = 'rgba(0,100,0,0.3)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(
            this._state.playerX * this._options.fetch('minimapScale'),
            this._state.playerY * this._options.fetch('minimapScale')
        );
        ctx.lineTo(
            rayX * this._options.fetch('minimapScale'),
            rayY * this._options.fetch('minimapScale')
        );
        ctx.closePath();
        ctx.stroke();
    }
};
