import { ge } from './utility.js';
import { Config } from './Config.js';
import { Player } from './Player.js';
import { Sprite } from './Sprite.js';

const iniImg = src => { const i = new Image(); i.src = src; return i; };
const gettime = () => (new Date()).getTime();

ge.MainController = class {
    constructor(screen_id, minimap_id, debug_output_element, options = {}) {
        this.running = true;
        this._state = {};
        this._sprites = [];
        this._screen = ge.$(screen_id);
        this._ctx = this._screen.getContext('2d');
        this._minimap = ge.$(minimap_id);
        this._options = new Config(options);
        this._debug = ge.$(debug_output_element);
        this._wallTextureAtlas = iniImg(this._options.fetch('wallTextureAtlas'));
        this._floorCeilingTextureAtlas = iniImg(this._options.fetch('floorCeilingTextureAtlas'));
        if (this._options.fetch('ceilingImage'))
            this._skyImage = iniImg(this._options.fetch('ceilingImage'));
        this._screen.width = this._options.fetch('screenWidth');
        this._screen.height = this._options.fetch('screenHeight');
        this._screen.style.width = this._options.fetch('screenElementWidth') + 'px';
        this._screen.style.height = this._options.fetch('screenElementHeight') + 'px';
        this._numRays = Math.ceil(this._options.fetch('screenWidth') / this._options.fetch('stripWidth'));
        this._halfFov = this._options.fetch('fov') / 2;
        this._fovFloorWeight = 0.85 + 5;
        this._screenMiddle = this._options.fetch('screenWidth') / 2;
        this._lastMoveLoopTime = undefined;
        let match = 999;
        let fov_degrees = 180 * this._options.fetch('fov') / Math.PI;
        for (let fov_key in ge.MainController.FOV_FLOOR_WEIGHT_TABLE) {
            const new_match = Math.abs(fov_key - fov_degrees);
            if (new_match < match) {
                this._fovFloorWeight = ge.MainController.FOV_FLOOR_WEIGHT_TABLE[fov_key];
                match = new_match;
            }
            if (match === 0) break;
        }
        this._viewDist = this._screenMiddle / Math.tan(this._halfFov);
        this.registerEventHandlers();
    }
    registerEventHandlers() {
        document.onkeydown = ge.bind(this._options.fetch('onkeydown'), this, this._state);
        document.onkeyup = ge.bind(this._options.fetch('onkeyup'), this, this._state);
    }
    deRegisterEventHandlers() {
        document.onkeydown = null;
        document.onkeyup = null;
    }
    start(map, initial_player_state = {}) {
        this._state.map = map;
        this._state.mapWidth = map[0].length;
        this._state.mapHeight = map.length;
        this._state.player = new Player(initial_player_state);
        if (this._minimap) this.drawMiniMap();
        this.drawLoop();
        this.moveLoop();
    }
    stop() {
        this.running = false;
        this.deRegisterEventHandlers();
    }
    addSprite(initial_sprite_state = {}) {
        const sprite_state = new Sprite(initial_sprite_state);
        sprite_state.spriteAtlasImage = iniImg(sprite_state.fetch('spriteAtlas'));
        this._sprites.push(sprite_state);
    }
    printDebug(str) {
        if (this._debug)
            this._debug.insertAdjacentHTML('beforeend', `${str}<br />`);
    }
    moveLoop() {
        const moveLoopTime = gettime();
        const timeDelta = moveLoopTime - this._lastMoveCycleTime;
        this.move(timeDelta);
        let nextMoveLoopTime = 1000 / this._options.fetch('moveRate');
        if (timeDelta > nextMoveLoopTime)
            nextMoveLoopTime = Math.max(1, nextMoveLoopTime - (timeDelta - nextMoveLoopTime));
        this._options.fetch('moveHandler')(this._state, this._sprites);
        this._lastMoveCycleTime = moveLoopTime;
        if (this.running)
            setTimeout(ge.bind(this.moveLoop, this), nextMoveLoopTime);
    }
    move(timeDelta) {
        const player = this._state.player;
        const timeCorrection = timeDelta / this._options.fetch('moveRate');
        if (isNaN(timeCorrection)) timeCorrection = 1;
        this.moveEntity(timeCorrection, player);
        for (let i = 0; i < this._sprites.length; i++)
            if (this._sprites[i].fetch('isMoving'))
                this.moveEntity(timeCorrection, this._sprites[i]);
    }
    moveEntity(timeCorrection, entity) {
        const moveStep = timeCorrection * entity.speed * entity.moveSpeed;
        const strafeStep = timeCorrection * entity.strafe * entity.moveSpeed;
        let newX = entity.x + Math.cos(entity.rot) * moveStep;
        let newY = entity.y + Math.sin(entity.rot) * moveStep;
        newX -= Math.sin(entity.rot) * strafeStep;
        newY += Math.cos(entity.rot) * strafeStep;
        entity.rot += timeCorrection * entity.dir * entity.rotSpeed;
        const c = this.detectCollision(newX, newY, entity);
        if (!c[0]) entity.x = newX;
        if (!c[1]) entity.y = newY;
    }
    detectCollision(x, y, entity) {
        const getMapEntry = ge.bind((x, y) => {
            if (entity.id) {
                x -= this._options.fetch('spriteDrawOffsetX');
                y -= this._options.fetch('spriteDrawOffsetY');
            }
            return this._state.map[Math.floor(y)][Math.floor(x)];
        }, this);
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
    drawLoop() {
        let start = 0;
        const ctx = this._ctx;
        ctx.clearRect(0, 0, this._screen.width, this._screen.height);
        if (this._debug) {
            this._debug.innerHTML = '';
            start = gettime()
        }
        if (this._minimap) this.updateMiniMap();
        this.drawSimpleCeilingAndGround();
        this.castRays();
        this._options.fetch('drawHandler')(ctx, this._state, this._sprites);
        if (start) {
            const runtime = gettime() - start;
            this.printDebug(`Runtime: ${runtime}`);
            const now = gettime();
            const timeDelta = now - this._debug_lastRenderCycleTime;
            this._debug_lastRenderCycleTime = now;
            const fps = Math.floor(1000 / timeDelta);
            this.printDebug(`FPS: ${fps}`);
        }
        if (this.running)
            setTimeout(ge.bind(this.drawLoop, this), 20);
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
            this._minimapWalls = ge.create('canvas');
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
                const wall = this._state.map[y][x];
                if (wall) {
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
            this._minimapObjects = ge.create('canvas');
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
            rayAngle %= ge.MainController.TWO_PI;
            if (rayAngle < 0) rayAngle += ge.MainController.TWO_PI;
            const res = this.castSingleRay(rayAngle, i);
            const dist = res[0] * Math.cos(this._state.player.fetch('rot') - rayAngle);
            distArray.push(dist);
            this.drawStrip(i, dist, res[1], res[2], res[3], res[4], rayAngle);
        }
        if (!this._sprites.length) return;
        const spriteOffsetX = this._options.fetch('spriteDrawOffsetX');
        const spriteOffsetY = this._options.fetch('spriteDrawOffsetY');
        const sprite_dists = {};
        const getDistanceToPlayer = ge.bind(sprite => {
            const sdx = sprite.fetch('x') - this._state.player.fetch('x') - spriteOffsetX;
            const sdy = sprite.fetch('y') - this._state.player.fetch('y') - spriteOffsetY;
            return Math.sqrt(sdx * sdx + sdy * sdy);
        }, this);
        if (this._sprites.length === 1)
            sprite_dists[this._sprites[0].fetch('id')] = getDistanceToPlayer(this._sprites[0]);
        else {
            this._sprites.sort((sprite1, sprite2) => {
                if (sprite_dists[sprite1.fetch('id')] === undefined)
                    sprite_dists[sprite1.fetch('id')] = getDistanceToPlayer(sprite1);
                if (sprite_dists[sprite2.fetch('id')] === undefined)
                    sprite_dists[sprite2.fetch('id')] = getDistanceToPlayer(sprite2);
                const sd1 = sprite_dists[sprite1.fetch('id')];
                const sd2 = sprite_dists[sprite2.fetch('id')];
                return sd2 - sd1;
            });
        }
        this._state.player.store('spriteDistances', sprite_dists);
        const crossHairSize = this._state.player.fetch('crossHairSize');
        const screenMiddle = this._screenMiddle;
        const playerCrosshairHit = [];
        for (let i = 0; i < this._sprites.length; i++) {
            const sprite = this._sprites[i];
            const distSprite = sprite_dists[sprite.fetch('id')];
            let xSprite = sprite.fetch('x') - spriteOffsetX;
            let ySprite = sprite.fetch('y') - spriteOffsetY;
            if (this._minimapObjects && sprite.fetch('drawOnMinimap')) {
                const ctx = this._minimapObjects.getContext('2d');
                ctx.fillStyle = sprite.fetch('minimapColor');
                ctx.fillRect(
                    xSprite * this._options.fetch('minimapScale'),
                    ySprite * this._options.fetch('minimapScale'),
                    4, 4
                );
            }
            xSprite = xSprite - this._state.player.fetch('x');
            ySprite = ySprite - this._state.player.fetch('y');
            const spriteAngle = Math.atan2(ySprite, xSprite) - this._state.player.fetch('rot');
            const size = this._viewDist / (Math.cos(spriteAngle) * distSprite);
            if (size <= 0) continue;
            const screenWidth = this._options.fetch('screenWidth');
            const screenHeight = this._options.fetch('screenHeight');
            let x = Math.floor(
                screenWidth / 2 + Math.tan(spriteAngle) *
                this._viewDist - size * sprite.fetch('spriteScaleX') / 2
            );
            let y = Math.floor(
                screenHeight / 2 - (0.55 + sprite.fetch('spriteScaleY') - 1) * size
            );
            const sx = Math.floor(size * sprite.fetch('spriteScaleX'));
            const sy = Math.ceil(sprite.fetch('spriteHeight') * 0.01 * size) +
                (0.45 + sprite.fetch('spriteScaleY') - 1) * size;
            const ctx = this._ctx;
            const stripWidth = this._options.fetch('stripWidth');
            const drawSprite = (tx, tw, sx, sw) => {
                if (tw <= 0 || sw <= 0) return;
                ctx.drawImage(
                    sprite.fetch('spriteAtlasImage'),
                    tx,
                    sprite.fetch('spriteOffsetY'),
                    tw,
                    sprite.fetch('spriteHeight'),
                    sx, y, sw, sy
                );
                if (sx <= screenMiddle + crossHairSize - 1 && sx + sw >= screenMiddle - crossHairSize + 1) {
                    sprite.store('playerCrossHair', (screenMiddle - sx) * tw / sw);
                    playerCrosshairHit.push(sprite);
                }
            };
            const tx = sprite.fetch('spriteOffsetX');
            const ts = sprite.fetch('spriteWidth');
            let cumulativeDS = 0;
            let cumulativeTS = 0;
            const strips = sx / stripWidth;
            let drawing = false;
            let execute_draw = false;
            sprite.store('hitList', []);
            for (let j = 0; j < strips; j++) {
                cumulativeDS += stripWidth;
                cumulativeTS += Math.floor(cumulativeDS * sprite.fetch('spriteWidth') / sx);
                cumulativeTS = cumulativeTS > sprite.fetch('spriteWidth') ?
                    sprite.fetch('spriteWidth') : cumulativeTS;
                const distIndex = Math.floor((x + cumulativeDS) * distArray.length / screenWidth);
                const distWall = distArray[distIndex];
                const distDelta = distWall - distSprite;
                if (distWall === undefined || distDelat < -0.1 * distSprite) {
                    if (drawing) execute_draw = true;
                    drawing = false;
                } else {
                    if (!drawing) {
                        drawing = true;
                        x = x + cumulativeDS;
                        tx = tx + cumulativeTS;
                        cumulativeDS = 0;
                        cumulativeTS = 0;
                    }
                }
                if (execute_draw) {
                    drawSprite(tx, cumulativeTS, x, cumulativeDS);
                    sprite.fetch('hitList').push([tx, cumulativeTS, x, cumulativeDS]);
                    execute_draw = false;
                    drawing = false;
                } else if (j + 1 >= strips && drawing) {
                    drawSprite(tx, cumulativeTS, x, cumulativeDS);
                    sprite.fetch('hitList').push([tx, cumulativeTS, x, cumulativeDS]);
                    break;
                }
            }
        }
        this._state.player.store('playerCrosshairHit', playerCrosshairHit);
    }
    castSingleRay(rayAngle, stripIdx) {
        const right = (rayAngle > ge.MainController.TWO_PI * 0.75 ||
                       rayAngle < ge.MainController.TWO_PI * 0.25);
        const up = (rayAngle < 0 || rayAngle > Math.PI);
        const v_x = Math.cos(rayAngle);
        const v_y = Math.sin(rayAngle);
        const slope_v = v_y / v_x;
        const dx_v = right ? 1 : -1;
        const dy_v = dx_v * slope_v;
        let x_v = right ?
            Math.ceil(this._state.player.fetch('x')) :
            Math.floor(this._state.player.fetch('x'));
        let y_v = this._state.player.fetch('y') + (x_v - this._state.player.fetch('x')) * slope_v;
        let do_v = true;
        let dist_v = -1;
        let xHit_v = 0;
        let yHit_v = 0;
        let wallType_v = 0;
        const slope_h = v_x / v_y;
        const dy_h = up ? -1 : 1;
        const dx_h = dy_h * slope_h;
        let y_h = up ?
            Math.floor(this._state.player.fetch('y')) :
            Math.ceil(this._state.player.fetch('y'));
        let x_h = this._state.player.fetch('x') + (y_h - this._state.player.fetch('y')) * slope_h;
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
                wallType_v = this._state.map[wally_v][wallx_v];
                if (wallType_v) {
                    distx = x_v - this._state.player.fetch('x');
                    disty = y_v - this._state.player.fetch('y');
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
                wallType_h = this._state.map[wally_h][wallx_h];
                if (wallType_h) {
                    distx = x_h - this._state.player.fetch('x');
                    disty = y_h - this._state.player.fetch('y');
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
        const vx = (hitX - this._state.player.fetch('x')) / dist;
        const vy = (hitY - this._state.player.fetch('y')) / dist;
        const bottom = foffset + fheight;
        for (let fy = 0; fy < fheight; fy++) {
            const currentDist = bottom / (2 * (fy + foffset) - bottom);
            const wx = this._state.player.fetch('x') + vx * currentDist * fweight;
            const wy = this._state.player.fetch('y') + vy * currentDist * fweight;
            const mx = Math.floor(wx);
            const my = Math.floor(wy);
            const floorType = this._state.map[my][mx];
            const floorTexturex = (wx * textureWidth) % textureWidth;
            const floorTexturey = (wy * textureHeight) % textureHeight;
            if (floorType) continue;
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
        let xoffset = this._state.player.fetch('rot');
        xoffset %= ge.MainController.TWO_PI;
        if (xoffset < 0) xoffset += ge.MainController.TWO_PI;
        let rot = xoffset * (img.width / ge.MainController.TWO_PI);
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
            this._state.player.fetch('x') * this._options.fetch('minimapScale'),
            this._state.player.fetch('y') * this._options.fetch('minimapScale')
        );
        ctx.lineTo(
            rayX * this._options.fetch('minimapScale'),
            rayY * this._options.fetch('minimapScale')
        );
        ctx.closePath();
        ctx.stroke();
    }
};

ge.MainController.TWO_PI = Math.PI * 2;
ge.MainController.FOV_FLOOR_WEIGHT_TABLE = {
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
