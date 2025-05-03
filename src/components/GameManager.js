import { Player } from './Player';
import { EnemyManager } from './EnemyManager';
import { CameraHandler } from './CameraHandler';
import { Map } from './Map';
import { setPaused, isPaused, setGuided, isGuided } from './GameState';
import { UIManager } from './UIManager';
import { AudioManager } from './AudioManager';
import { UpgradeSystem } from './UpgradeSystem';

export class GameManager {
    constructor() {
        this.app = null;
        this.physicsWorld = null;
        this.AmmoLib = null;

        this.player = null;
        this.enemyManager = null;
        this.upgradeSystem = null;
        this.map = null;
        this.cameraHandler = null;

        this.uiManager = new UIManager();
        this.audioManager = null;

        this.accumulator = 0;
        this.elapsedTime = 0;

        this._setupUI();
    }

    _setupUI() {
        this.uiManager.initialize(() => isPaused, () => isGuided);
        const restartBtn = document.getElementById('restart-button');
        restartBtn?.addEventListener('click', () => this.restartGame());
    }

    async initializeGame() {
        try {
            this.AmmoLib = await this._loadAmmoJS();
            window.Ammo = this.AmmoLib;

            await this._initializePlayCanvas();
            this.audioManager = new AudioManager();
            await this.audioManager.initialize(this.app);

            this.audioManager.playBGM();
            this.audioManager.setBGMVolume(0.2);
            this.audioManager.setSFXVolume(0.4);

            await this._initializePhysics();

            this.setupLight();
            this.initializePlayer();
            this.initializeEnemyManager();
            this.initializeUpgradeSystem();
            this.initializeMapAndCamera();
            this.setupUpdateLoop();

            console.log('✅ Game initialized successfully');
        } catch (err) {
            console.error('❌ Game initialization error:', err);
            throw err;
        }
    }

    async _loadAmmoJS() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/gh/kripken/ammo.js@HEAD/builds/ammo.wasm.js';
            script.onload = async () => {
                if (typeof Ammo === 'function') {
                    try {
                        const ammo = await Ammo();
                        resolve(ammo);
                    } catch (err) {
                        reject(new Error(`Ammo init failed: ${err.message}`));
                    }
                } else {
                    reject(new Error('Ammo not available'));
                }
            };
            script.onerror = () => reject(new Error('Ammo.js failed to load'));
            document.head.appendChild(script);
        });
    }

    async _initializePlayCanvas() {
        const canvas = document.getElementById('application-canvas');
        if (!canvas) throw new Error('Canvas element not found');

        this.app = new pc.Application(canvas);
        this.app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
        this.app.setCanvasResolution(pc.RESOLUTION_AUTO);
        this.app.mouse = new pc.Mouse(canvas);
        this.app.keyboard = new pc.Keyboard(window);
        this.app.touch = new pc.TouchDevice(canvas);
        this.app.elementInput = new pc.ElementInput(canvas);

        const scene = new pc.Entity('Scene');
        this.app.root.addChild(scene);
        this.app.start();

        window.addEventListener('resize', () => this.app.resizeCanvas());
    }

    async _initializePhysics() {
        const Ammo = this.AmmoLib;
        const config = new Ammo.btDefaultCollisionConfiguration();
        const dispatcher = new Ammo.btCollisionDispatcher(config);
        const broadphase = new Ammo.btDbvtBroadphase();
        const solver = new Ammo.btSequentialImpulseConstraintSolver();

        this.physicsWorld = new Ammo.btDiscreteDynamicsWorld(dispatcher, broadphase, solver, config);
        this.physicsWorld.setGravity(new Ammo.btVector3(0, -9.81, 0));
        await new Promise(r => setTimeout(r, 100));

        if (!this.app.systems.rigidbody) throw new Error('RigidBody system not ready');
        this.app.systems.rigidbody.physicsWorld = this.physicsWorld;
    }

    setupLight() {
        const light = new pc.Entity("DirectionalLight");
        light.addComponent("light", {
            type: pc.LIGHTTYPE_DIRECTIONAL,
            color: new pc.Color(1, 1, 1),
            castShadows: true,
            intensity: 1
        });
        light.setEulerAngles(45, 30, 0);
        this.app.root.addChild(light);
    }

    initializePlayer() {
        this.player = new Player(this.app, "models/Mage.glb", "textures/mage_texture.png", 0.4, []);
    }

    initializeEnemyManager() {
        this.enemyManager = new EnemyManager(this.app, this.player);
    }

    initializeUpgradeSystem() {
        const enemies = this.enemyManager.getEnemies();
        this.upgradeSystem = new UpgradeSystem(this.app, this.player, this.uiManager, enemies);

        this.upgradeSystem.magicStaff.on('attack', () => this.audioManager.playSFX('attack'));
        this.upgradeSystem.magicStaff.on('enemyHit', () => this.audioManager.playSFX('hit'));

        this.app.on('magicBoxUnlocked', () => {
            this.upgradeSystem.magicBox?.on('enemyHit', () => this.audioManager.playSFX('hit'));
        });

        this.player.on('levelup', () => this.upgradeSystem.handleLevelUp());
    }

    initializeMapAndCamera() {
        this.map = new Map(this.app, "textures/grass_texture.jpg", this.player);
        this.cameraHandler = new CameraHandler(this.app, this.player.entity, new pc.Vec3(0, 10, 10), 10);
        this.cameraHandler.smoothing = 15;

        this.app.root.on('xpCollected', () => this.audioManager.playSFX('collect'));
    }

    setupUpdateLoop() {
        const STEP = 1 / 60;

        this.app.on("update", (dt) => {
            this.cameraHandler.update(dt);
            if (isPaused || isGuided) return;

            this.accumulator += dt;
            while (this.accumulator >= STEP) {
                this.physicsWorld.stepSimulation(STEP, 1);
                this.accumulator -= STEP;
            }

            if (this.player && this.enemyManager) {
                this.player.setEnemies(this.enemyManager.getEnemies());
                this.enemyManager.update(dt);
                this.player.update(dt);

                this.uiManager.updateHPBar(this.player.health, this.player.maxHealth);
                this.uiManager.updateXPBar(this.player.xp, this.player.xpToLevelUp, this.player.level);
                this.uiManager.updateTimer();

                this.upgradeSystem.magicStaff?.update(dt);
                this.upgradeSystem.magicBox?.update(dt);
            }

            this.elapsedTime += dt;
            window.gameElapsedTime = this.elapsedTime;
        });
    }

    startGame() {
        document.getElementById('start-screen')?.classList.add('hide');
        setPaused(false);

        document.getElementById('ingame-ui')?.classList.add('show');
        const movementGuide = document.getElementById('movement-guide');
        const attackGuide = document.getElementById('attack-guide');

        movementGuide?.classList.add('show');

        const keys = { w: false, a: false, s: false, d: false };
        const onKey = (e) => {
            const key = e.key.toLowerCase();
            if (!keys.hasOwnProperty(key)) return;
            keys[key] = true;
            document.querySelector(`[data-key="${key}"]`)?.classList.add('pressed');

            if (Object.values(keys).every(Boolean)) {
                setGuided(false);
                this.uiManager.initializeTimer();

                setTimeout(() => {
                    movementGuide?.classList.replace('show', 'hide');
                    window.removeEventListener('keydown', onKey);
                    attackGuide?.classList.add('show');
                }, 1500);

                setTimeout(() => {
                    attackGuide?.classList.remove('show');
                    attackGuide?.classList.add('hide');
                }, 5000);
            }
        };

        window.addEventListener('keydown', onKey);
    }

    showGameOver() {
        const h = document.getElementById('hours')?.textContent;
        const m = document.getElementById('minutes')?.textContent;
        const s = document.getElementById('seconds')?.textContent;
        const finalTime = document.getElementById('final-time');
        finalTime && (finalTime.textContent = `Time Survived: ${h}:${m}:${s}`);

        document.getElementById('game-over-screen')?.classList.add('show');
    }

    hideGameOver() {
        document.getElementById('game-over-screen')?.classList.remove('show');
    }

    async restartGame() {
        location.reload();
    }

    cleanupGameObjects() {
        this.app.root.children.slice().forEach(e => e !== this.app.root && e.destroy());
        this.app.mouse.detachAll();
        this.app.keyboard.detachAll();
        this.app.touch.detachAll();
    }

    getUIManager() { return this.uiManager; }
    getAudioManager() { return this.audioManager; }
    getPlayer() { return this.player; }
    getEnemyManager() { return this.enemyManager; }
}