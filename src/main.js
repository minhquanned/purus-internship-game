import * as pc from 'playcanvas';
import { Player } from './components/Player';
import { EnemyManager } from './components/EnemyManager';
import { CameraHandler } from './components/CameraHandler';
import { Map } from './components/Map';
import { MagicStaff } from './components/WeaponMagicStaff';
import { setPaused, isPaused, setGuided, isGuided } from './components/GameState';
import { UIManager } from './components/UIManager';
import { GameManager } from './components/GameManager';

let uiManager = new UIManager();
uiManager.initialize(
    () => isPaused, 
    () => isGuided
);

document.getElementById('start-button').addEventListener('click', () => {
    document.getElementById('start-screen').style.display = 'none';
    setPaused(false);

    // Show in-game UI
    const inGameUI = document.getElementById('ingame-ui');
    inGameUI.classList.add('show');

    // Show guide
    const movementGuide = document.getElementById('movement-guide');
    const attackGuide = document.getElementById('attack-guide');
    movementGuide.classList.add('show');
    
    const pressedKeys = {
        w: false,
        a: false,
        s: false,
        d: false
    };

    // Key press check
    function checkAllKeysPressed() {
        return Object.values(pressedKeys).every(value => value);
    }

    // Key press handler
    function handleKeyPress(e) {
        const key = e.key.toLowerCase();
        if (['w', 'a', 's', 'd'].includes(key)) {
            pressedKeys[key] = true;
            const keyElement = document.querySelector(`[data-key="${key}"]`);
            if (keyElement) {
                keyElement.classList.add('pressed');
            }

            if (checkAllKeysPressed()) {
                setGuided(false);
                uiManager.initializeTimer();
                
                setTimeout(() => {
                    movementGuide.classList.remove('show');
                    movementGuide.classList.add('hide');
                    // Cleanup
                    window.removeEventListener('keydown', handleKeyPress);

                    attackGuide.classList.add('show');
                }, 1500);

                setTimeout(() => {
                    attackGuide.classList.remove('show');
                    attackGuide.classList.add('hide');
                }, 5000);
            }
        }
    }

    window.addEventListener('keydown', handleKeyPress);
});

async function initializeGame() {
    try {
        // Load Ammo.js first
        const AmmoLib = await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/gh/kripken/ammo.js@HEAD/builds/ammo.wasm.js';
            script.async = true;

            script.onload = async () => {
                try {
                    if (typeof Ammo === 'function') {
                        console.log('Ammo.js script loaded, initializing...');
                        const ammo = await Ammo();
                        console.log('Ammo.js initialized successfully');
                        resolve(ammo);
                    } else {
                        reject(new Error('Ammo.js loaded but Ammo function not found'));
                    }
                } catch (error) {
                    reject(new Error(`Ammo.js initialization failed: ${error.message}`));
                }
            };

            script.onerror = () => {
                reject(new Error('Failed to load Ammo.js script'));
            };

            document.head.appendChild(script);
        });

        // Store Ammo globally first
        window.Ammo = AmmoLib;
        console.log('Ammo.js loaded and initialized');

        // Initialize PlayCanvas app
        const canvas = document.getElementById('application-canvas');
        if (!canvas) {
            throw new Error('Canvas element not found');
        }

        console.log('Creating PlayCanvas application');
        const app = new pc.Application(canvas);

        // Basic app setup
        app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
        app.setCanvasResolution(pc.RESOLUTION_AUTO);

        // Add input systems
        app.mouse = new pc.Mouse(canvas);
        app.keyboard = new pc.Keyboard(window);
        app.touch = new pc.TouchDevice(canvas);
        app.elementInput = new pc.ElementInput(canvas);

        // Create and add a scene
        const scene = new pc.Entity('Scene');
        app.root.addChild(scene);

        // Start the application before physics setup
        app.start();

        // Initialize physics world
        console.log('Initializing physics world');
        const collisionConfiguration = new AmmoLib.btDefaultCollisionConfiguration();
        const dispatcher = new AmmoLib.btCollisionDispatcher(collisionConfiguration);
        const overlappingPairCache = new AmmoLib.btDbvtBroadphase();
        const solver = new AmmoLib.btSequentialImpulseConstraintSolver();
        
        const physicsWorld = new AmmoLib.btDiscreteDynamicsWorld(
            dispatcher,
            overlappingPairCache,
            solver,
            collisionConfiguration
        );
        
        // Set gravity
        const gravity = new AmmoLib.btVector3(0, -9.81, 0);
        physicsWorld.setGravity(gravity);

        // Wait for physics systems to be ready
        await new Promise(resolve => setTimeout(resolve, 100));

        // Verify and set up physics system
        if (!app.systems.rigidbody) {
            throw new Error('RigidBody system not initialized by PlayCanvas');
        }
        app.systems.rigidbody.physicsWorld = physicsWorld;

        const gameManager = new GameManager(app);
        // gameManager.setPhysicsWorld(physicsWorld)
        window.gameManager = gameManager;

        // Handle window resize
        window.addEventListener('resize', () => {
            app.resizeCanvas();
        });

        console.log('Setting up game components');
        
        // Set up light first (no physics dependency)
        const light = new pc.Entity("DirectionalLight");
        light.addComponent("light", {
            type: pc.LIGHTTYPE_DIRECTIONAL,
            color: new pc.Color(1, 1, 1),
            castShadows: true,
            intensity: 1
        });
        light.setEulerAngles(45, 30, 0);
        app.root.addChild(light);

        // Initialize game components with proper error handling
        let player;
        try {
            player = new Player(
                app, 
                "models/Mage.glb", 
                "textures/mage_texture.png", 
                0.4,
                []
            );
        } catch (error) {
            console.error('Failed to initialize player:', error);
            throw new Error('Player initialization failed: ' + error.message);
        }

        let enemyManager;
        try {
            enemyManager = new EnemyManager(app, player);
            // await enemyManager.spawnEnemy(
            //     "models/Skeleton_Minion.glb", 
            //     "textures/skeleton_texture.png", 
            //     0.4
            // );
        } catch (error) {
            console.error('Failed to initialize enemy manager:', error);
            throw new Error('Enemy manager initialization failed: ' + error.message);
        }

        let magicStaff;
        try {
            magicStaff = new MagicStaff(app, player.entity, enemyManager.getEnemies());
        } catch (error) {
            console.error('Failed to initialize magic staff:', error);
            throw new Error('Magic staff initialization failed: ' + error.message);
        }
        enemyManager.setWeaponSystem(magicStaff);

        const map = new Map(app, "textures/grass_texture.jpg", player);
        const cameraHandler = new CameraHandler(app, player.entity);

        // Game update loop with fixed timestep
        const FIXED_TIMESTEP = 1/60;
        let accumulator = 0;

        app.on("update", (dt) => {
            cameraHandler.update(dt);

            if (isPaused || isGuided) return;

            accumulator += dt;
            
            // Update physics with fixed timestep
            while (accumulator >= FIXED_TIMESTEP) {
                physicsWorld.stepSimulation(FIXED_TIMESTEP, 1);
                accumulator -= FIXED_TIMESTEP;
            }
            
            // Update game components
            if (player && enemyManager && magicStaff) {
                player.setEnemies(enemyManager.getEnemies());
                enemyManager.update(dt);
                player.update(dt);
                uiManager.updateHPBar(player.health, player.maxHealth);
                uiManager.updateTimer();
                magicStaff.update(dt);
            }
        });
        
        console.log('Game initialized successfully!');
        
        return {
            app,
            physicsWorld,
            AmmoLib
        };
    } catch (error) {
        console.error('Detailed initialization error:', error);
        throw error;
    }
}

// Start game when DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded - Starting game initialization');
    
    const loadingDiv = document.createElement('div');
    loadingDiv.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.8); color: white; padding: 20px; border-radius: 5px; z-index: 1000;';
    loadingDiv.textContent = 'Loading game...';
    document.body.appendChild(loadingDiv);
    
    initializeGame()
        .then(() => {
            loadingDiv.remove();
        })
        .catch(error => {
            console.error('Error initializing game:', error);
            loadingDiv.style.background = 'rgba(255,0,0,0.8)';
            loadingDiv.textContent = `Game initialization failed: ${error.message}. Please check console for details.`;
        });
});