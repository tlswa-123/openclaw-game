// 游戏配置
const CONFIG = {
    TILE_SIZE: 40,
    COLS: 20,
    ROWS: 15,
    TOTAL_CORRIDORS: 10,
    PLAYER_SPEED: 5,
    ANOMALY_CHANCE: 0.7, // 70% 概率出现异常（从第 2 条走廊开始）
};

// 游戏状态
const GameState = {
    START: 'start',
    PLAYING: 'playing',
    GAME_OVER: 'gameover',
    WIN: 'win'
};

// 异常类型
const AnomalyTypes = {
    MISSING_LIGHT: 'missing_light',      // 少了一盏灯
    BROKEN_TILE: 'broken_tile',          // 地板破损
    EXTRA_DOOR: 'extra_door',            // 多了一扇门
    SHADOW: 'shadow',                    // 奇怪的影子
    WRONG_SIGN: 'wrong_sign',            // 错误的指示牌
};

class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 40;
        this.color = '#ff6b6b';
        this.direction = 'down';
        this.isMoving = false;
    }

    draw(ctx) {
        // 绘制像素风格的学生
        ctx.fillStyle = this.color;
        // 身体
        ctx.fillRect(this.x, this.y, this.width, this.height);
        // 书包
        ctx.fillStyle = '#4a4a6a';
        ctx.fillRect(this.x - 5, this.y + 10, 5, 20);
        // 头发
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(this.x - 2, this.y - 5, this.width + 4, 10);
        // 眼睛
        ctx.fillStyle = '#fff';
        ctx.fillRect(this.x + 5, this.y + 8, 6, 6);
        ctx.fillRect(this.x + 19, this.y + 8, 6, 6);
        ctx.fillStyle = '#000';
        ctx.fillRect(this.x + 7, this.y + 10, 3, 3);
        ctx.fillRect(this.x + 21, this.y + 10, 3, 3);
    }

    move(dx, dy, corridors) {
        const newX = this.x + dx * CONFIG.PLAYER_SPEED;
        const newY = this.y + dy * CONFIG.PLAYER_SPEED;
        
        // 边界检查
        if (newX < 0 || newX + this.width > CONFIG.COLS * CONFIG.TILE_SIZE) return;
        if (newY < 0 || newY + this.height > CONFIG.ROWS * CONFIG.TILE_SIZE) return;
        
        // 墙壁碰撞检测
        const currentCorridor = corridors.getCurrentCorridor();
        if (!currentCorridor.isWalkable(newX, newY, this.width, this.height)) return;
        
        this.x = newX;
        this.y = newY;
        this.isMoving = true;
        
        // 更新方向
        if (dx > 0) this.direction = 'right';
        if (dx < 0) this.direction = 'left';
        if (dy > 0) this.direction = 'down';
        if (dy < 0) this.direction = 'up';
    }

    getCenter() {
        return {
            x: this.x + this.width / 2,
            y: this.y + this.height / 2
        };
    }
}

class Corridor {
    constructor(number, hasAnomaly = false) {
        this.number = number;
        this.hasAnomaly = hasAnomaly;
        this.anomalyType = hasAnomaly ? this.getRandomAnomalyType() : null;
        this.anomalyDetected = false;
        this.playerExited = false;
        this.walls = this.generateWalls();
        this.lights = this.generateLights();
        this.floorTiles = this.generateFloor();
    }

    getRandomAnomalyType() {
        const types = Object.values(AnomalyTypes);
        return types[Math.floor(Math.random() * types.length)];
    }

    generateWalls() {
        const walls = [];
        // 左右墙壁
        for (let y = 0; y < CONFIG.ROWS; y++) {
            walls.push({ x: 0, y: y * CONFIG.TILE_SIZE, width: CONFIG.TILE_SIZE, height: CONFIG.TILE_SIZE });
            walls.push({ x: (CONFIG.COLS - 1) * CONFIG.TILE_SIZE, y: y * CONFIG.TILE_SIZE, width: CONFIG.TILE_SIZE, height: CONFIG.TILE_SIZE });
        }
        return walls;
    }

    generateLights() {
        const lights = [];
        const lightCount = 5;
        for (let i = 0; i < lightCount; i++) {
            lights.push({
                x: CONFIG.COLS * CONFIG.TILE_SIZE / 2 + (i % 2 === 0 ? -60 : 60),
                y: 60 + Math.floor(i / 2) * 120,
                on: true
            });
        }
        return lights;
    }

    generateFloor() {
        const tiles = [];
        for (let x = 1; x < CONFIG.COLS - 1; x++) {
            for (let y = 0; y < CONFIG.ROWS; y++) {
                tiles.push({
                    x: x * CONFIG.TILE_SIZE,
                    y: y * CONFIG.TILE_SIZE,
                    type: 'normal'
                });
            }
        }
        return tiles;
    }

    applyAnomaly() {
        if (!this.hasAnomaly) return;
        
        switch (this.anomalyType) {
            case AnomalyTypes.MISSING_LIGHT:
                // 关闭一盏灯
                if (this.lights.length > 0) {
                    const randomLight = this.lights[Math.floor(Math.random() * this.lights.length)];
                    randomLight.on = false;
                }
                break;
            case AnomalyTypes.BROKEN_TILE:
                // 损坏一些地板
                const brokenCount = 3;
                for (let i = 0; i < brokenCount; i++) {
                    const randomTile = this.floorTiles[Math.floor(Math.random() * this.floorTiles.length)];
                    randomTile.type = 'broken';
                }
                break;
            case AnomalyTypes.EXTRA_DOOR:
                // 在墙上添加一扇额外的门
                this.extraDoor = {
                    x: (CONFIG.COLS - 1) * CONFIG.TILE_SIZE,
                    y: CONFIG.ROWS * CONFIG.TILE_SIZE / 2,
                    width: CONFIG.TILE_SIZE,
                    height: CONFIG.TILE_SIZE * 2
                };
                break;
            case AnomalyTypes.SHADOW:
                // 添加奇怪的影子
                this.shadow = {
                    x: CONFIG.COLS * CONFIG.TILE_SIZE / 2,
                    y: CONFIG.ROWS * CONFIG.TILE_SIZE / 2,
                    width: 80,
                    height: 80
                };
                break;
            case AnomalyTypes.WRONG_SIGN:
                // 添加错误的指示牌
                this.wrongSign = {
                    x: CONFIG.TILE_SIZE * 2,
                    y: CONFIG.TILE_SIZE * 2,
                    text: '←'
                };
                break;
        }
    }

    isWalkable(x, y, width, height) {
        // 检查墙壁碰撞
        for (const wall of this.walls) {
            if (this.rectCollision(x, y, width, height, wall.x, wall.y, wall.width, wall.height)) {
                return false;
            }
        }
        return true;
    }

    rectCollision(x1, y1, w1, h1, x2, y2, w2, h2) {
        return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
    }

    draw(ctx, player) {
        // 绘制地板
        for (const tile of this.floorTiles) {
            ctx.fillStyle = tile.type === 'broken' ? '#5a4a4a' : '#6a6a8a';
            ctx.fillRect(tile.x + 1, tile.y + 1, CONFIG.TILE_SIZE - 2, CONFIG.TILE_SIZE - 2);
        }
        
        // 绘制墙壁
        ctx.fillStyle = '#3a3a5a';
        for (const wall of this.walls) {
            ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
        }
        
        // 绘制灯
        for (const light of this.lights) {
            if (light.on) {
                ctx.fillStyle = '#ffd700';
                ctx.beginPath();
                ctx.arc(light.x, light.y, 8, 0, Math.PI * 2);
                ctx.fill();
                // 光晕
                ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
                ctx.beginPath();
                ctx.arc(light.x, light.y, 20, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.fillStyle = '#4a4a4a';
                ctx.beginPath();
                ctx.arc(light.x, light.y, 8, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        // 绘制异常
        if (this.hasAnomaly) {
            switch (this.anomalyType) {
                case AnomalyTypes.EXTRA_DOOR:
                    if (this.extraDoor) {
                        ctx.fillStyle = '#8b4513';
                        ctx.fillRect(this.extraDoor.x, this.extraDoor.y, this.extraDoor.width, this.extraDoor.height);
                        // 门把手
                        ctx.fillStyle = '#ffd700';
                        ctx.beginPath();
                        ctx.arc(this.extraDoor.x + 10, this.extraDoor.y + this.extraDoor.height / 2, 5, 0, Math.PI * 2);
                        ctx.fill();
                    }
                    break;
                case AnomalyTypes.SHADOW:
                    if (this.shadow) {
                        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                        ctx.fillRect(this.shadow.x, this.shadow.y, this.shadow.width, this.shadow.height);
                    }
                    break;
                case AnomalyTypes.WRONG_SIGN:
                    if (this.wrongSign) {
                        ctx.fillStyle = '#fff';
                        ctx.fillRect(this.wrongSign.x, this.wrongSign.y, 40, 40);
                        ctx.fillStyle = '#f00';
                        ctx.font = '30px Arial';
                        ctx.fillText(this.wrongSign.text, this.wrongSign.x + 10, this.wrongSign.y + 30);
                    }
                    break;
            }
        }
        
        // 绘制出口标志
        ctx.fillStyle = '#4a4';
        ctx.fillRect((CONFIG.COLS - 2) * CONFIG.TILE_SIZE + 10, CONFIG.ROWS * CONFIG.TILE_SIZE - 50, 20, 20);
        ctx.fillStyle = '#fff';
        ctx.font = '16px Arial';
        ctx.fillText('EXIT', (CONFIG.COLS - 2) * CONFIG.TILE_SIZE, CONFIG.ROWS * CONFIG.TILE_SIZE - 30);
    }

    checkAnomalyDetection(player) {
        if (!this.hasAnomaly || this.anomalyDetected) return false;
        
        // 玩家接近异常时检测
        const center = player.getCenter();
        const detectionRange = 150;
        
        let detected = false;
        switch (this.anomalyType) {
            case AnomalyTypes.MISSING_LIGHT:
                const offLights = this.lights.filter(l => !l.on);
                if (offLights.length > 0) {
                    const light = offLights[0];
                    const dist = Math.hypot(center.x - light.x, center.y - light.y);
                    detected = dist < detectionRange;
                }
                break;
            case AnomalyTypes.BROKEN_TILE:
                const brokenTiles = this.floorTiles.filter(t => t.type === 'broken');
                if (brokenTiles.length > 0) {
                    const tile = brokenTiles[0];
                    const dist = Math.hypot(center.x - (tile.x + CONFIG.TILE_SIZE/2), center.y - (tile.y + CONFIG.TILE_SIZE/2));
                    detected = dist < detectionRange;
                }
                break;
            case AnomalyTypes.EXTRA_DOOR:
                if (this.extraDoor) {
                    const dist = Math.hypot(center.x - (this.extraDoor.x + this.extraDoor.width/2), center.y - (this.extraDoor.y + this.extraDoor.height/2));
                    detected = dist < detectionRange;
                }
                break;
            case AnomalyTypes.SHADOW:
                if (this.shadow) {
                    const dist = Math.hypot(center.x - (this.shadow.x + this.shadow.width/2), center.y - (this.shadow.y + this.shadow.height/2));
                    detected = dist < detectionRange;
                }
                break;
            case AnomalyTypes.WRONG_SIGN:
                if (this.wrongSign) {
                    const dist = Math.hypot(center.x - (this.wrongSign.x + 20), center.y - (this.wrongSign.y + 20));
                    detected = dist < detectionRange;
                }
                break;
        }
        
        if (detected) {
            this.anomalyDetected = true;
        }
        return detected;
    }

    checkExitZone(player) {
        // 出口区域在走廊尽头
        const exitX = (CONFIG.COLS - 2) * CONFIG.TILE_SIZE;
        const exitY = (CONFIG.ROWS - 2) * CONFIG.TILE_SIZE;
        const center = player.getCenter();
        
        return center.x > exitX && center.y > exitY;
    }

    checkReturnZone(player) {
        // 返回区域在走廊起点
        const returnX = CONFIG.TILE_SIZE * 2;
        const returnY = CONFIG.TILE_SIZE * 2;
        const center = player.getCenter();
        
        return center.x < returnX + 50 && center.y < returnY + 50;
    }
}

class CorridorManager {
    constructor() {
        this.corridors = [];
        this.currentCorridorIndex = 0;
        this.totalAttempts = 1;
        this.initializeCorridors();
    }

    initializeCorridors() {
        for (let i = 1; i <= CONFIG.TOTAL_CORRIDORS; i++) {
            // 第一条走廊正常，之后的有概率出现异常
            const hasAnomaly = i > 1 && Math.random() < CONFIG.ANOMALY_CHANCE;
            const corridor = new Corridor(i, hasAnomaly);
            if (hasAnomaly) {
                corridor.applyAnomaly();
            }
            this.corridors.push(corridor);
        }
    }

    getCurrentCorridor() {
        return this.corridors[this.currentCorridorIndex];
    }

    getCurrentCorridorNumber() {
        return this.currentCorridorIndex + 1;
    }

    moveToNextCorridor() {
        this.currentCorridorIndex++;
        if (this.currentCorridorIndex >= this.corridors.length) {
            return 'win';
        }
        return 'continue';
    }

    resetToStart() {
        this.currentCorridorIndex = 0;
        this.totalAttempts++;
        // 重新生成走廊（异常会变化）
        this.corridors = [];
        this.initializeCorridors();
    }

    getTotalAttempts() {
        return this.totalAttempts;
    }

    isComplete() {
        return this.currentCorridorIndex >= this.corridors.length;
    }
}

class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.state = GameState.START;
        this.player = null;
        this.corridors = null;
        this.keys = {};
        this.message = '';
        this.showMessageTime = 0;
        
        this.setupInput();
        this.gameLoop = this.gameLoop.bind(this);
    }

    setupInput() {
        document.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;
            // 阻止方向键滚动页面
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
                e.preventDefault();
            }
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
        });
    }

    start() {
        document.getElementById('start-screen').classList.add('hidden');
        document.getElementById('game-over-screen').classList.add('hidden');
        document.getElementById('win-screen').classList.add('hidden');
        
        this.player = new Player(CONFIG.TILE_SIZE * 2, CONFIG.TILE_SIZE * 2);
        this.corridors = new CorridorManager();
        this.state = GameState.PLAYING;
        this.message = '发现异常时请回头离开！';
        this.showMessageTime = Date.now() + 3000;
        
        requestAnimationFrame(this.gameLoop);
    }

    restart() {
        this.start();
    }

    update() {
        if (this.state !== GameState.PLAYING) return;
        
        const currentCorridor = this.corridors.getCurrentCorridor();
        
        // 处理移动
        let dx = 0, dy = 0;
        if (this.keys['ArrowUp'] || this.keys['w'] || this.keys['W']) dy = -1;
        if (this.keys['ArrowDown'] || this.keys['s'] || this.keys['S']) dy = 1;
        if (this.keys['ArrowLeft'] || this.keys['a'] || this.keys['A']) dx = -1;
        if (this.keys['ArrowRight'] || this.keys['d'] || this.keys['D']) dx = 1;
        
        if (dx !== 0 || dy !== 0) {
            // 归一化对角线移动
            const length = Math.hypot(dx, dy);
            dx /= length;
            dy /= length;
            this.player.move(dx, dy, this.corridors);
        }
        
        // 检测异常
        const detected = currentCorridor.checkAnomalyDetection(this.player);
        if (detected && !currentCorridor.anomalyDetected) {
            this.message = '⚠️ 发现异常！请回头离开！';
            this.showMessageTime = Date.now() + 3000;
        }
        
        // 检查是否到达出口
        if (currentCorridor.checkExitZone(this.player)) {
            if (currentCorridor.hasAnomaly && currentCorridor.anomalyDetected) {
                // 发现异常后还继续前进 - 游戏结束
                this.state = GameState.GAME_OVER;
                document.getElementById('final-corridor').textContent = this.corridors.getCurrentCorridorNumber();
                document.getElementById('game-over-screen').classList.remove('hidden');
            } else if (currentCorridor.hasAnomaly && !currentCorridor.anomalyDetected) {
                // 没发现异常就前进 - 游戏结束
                this.state = GameState.GAME_OVER;
                document.getElementById('final-corridor').textContent = this.corridors.getCurrentCorridorNumber();
                document.getElementById('game-over-screen').classList.remove('hidden');
            } else {
                // 正常走廊或已回头离开的异常走廊 - 进入下一个
                const result = this.corridors.moveToNextCorridor();
                if (result === 'win') {
                    this.state = GameState.WIN;
                    document.getElementById('win-attempts').textContent = this.corridors.getTotalAttempts();
                    document.getElementById('win-screen').classList.remove('hidden');
                } else {
                    // 重置玩家位置到新走廊起点
                    this.player.x = CONFIG.TILE_SIZE * 2;
                    this.player.y = CONFIG.TILE_SIZE * 2;
                    this.message = `走廊 ${this.corridors.getCurrentCorridorNumber()}/10`;
                    this.showMessageTime = Date.now() + 2000;
                }
            }
        }
        
        // 检查是否回头离开（返回起点区域）
        if (currentCorridor.hasAnomaly && currentCorridor.anomalyDetected && !currentCorridor.playerExited) {
            if (currentCorridor.checkReturnZone(this.player)) {
                currentCorridor.playerExited = true;
                this.message = '✓ 正确！继续前进到下一个走廊';
                this.showMessageTime = Date.now() + 2000;
                // 自动进入下一个走廊
                setTimeout(() => {
                    if (this.state === GameState.PLAYING) {
                        const result = this.corridors.moveToNextCorridor();
                        if (result === 'win') {
                            this.state = GameState.WIN;
                            document.getElementById('win-attempts').textContent = this.corridors.getTotalAttempts();
                            document.getElementById('win-screen').classList.remove('hidden');
                        } else {
                            this.player.x = CONFIG.TILE_SIZE * 2;
                            this.player.y = CONFIG.TILE_SIZE * 2;
                        }
                    }
                }, 1000);
            }
        }
        
        // 更新 UI
        document.getElementById('corridor-num').textContent = this.corridors.getCurrentCorridorNumber();
        document.getElementById('attempt-num').textContent = this.corridors.getTotalAttempts();
    }

    draw() {
        // 清空画布
        this.ctx.fillStyle = '#1a1a2e';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (this.state === GameState.PLAYING) {
            const currentCorridor = this.corridors.getCurrentCorridor();
            currentCorridor.draw(this.ctx, this.player);
            this.player.draw(this.ctx);
        }
        
        // 绘制消息
        if (this.message && Date.now() < this.showMessageTime) {
            document.getElementById('message').textContent = this.message;
        } else {
            document.getElementById('message').textContent = '';
        }
    }

    gameLoop() {
        this.update();
        this.draw();
        
        if (this.state === GameState.PLAYING) {
            requestAnimationFrame(this.gameLoop);
        }
    }
}

// 创建游戏实例
const game = new Game();
