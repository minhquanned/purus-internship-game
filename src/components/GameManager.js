import { setPaused } from './GameState';
import { UIManager } from './UIManager';

export class GameManager {
    constructor(app) {
        this.app = app;
        this.uiManager = new UIManager();
        this.initializeGameOver();
    }

    initializeGameOver() {
        const restartButton = document.getElementById('restart-button');
        if (restartButton) {
            restartButton.addEventListener('click', () => this.restartGame());
        }
    }

    showGameOver() {
        // Get final time from UI
        const hours = document.getElementById('hours').textContent;
        const minutes = document.getElementById('minutes').textContent;
        const seconds = document.getElementById('seconds').textContent;
        
        // Update final time display
        const finalTime = document.getElementById('final-time');
        if (finalTime) {
            finalTime.textContent = `Time Survived: ${hours}:${minutes}:${seconds}`;
        }

        // Show game over screen
        const gameOverScreen = document.getElementById('game-over-screen');
        if (gameOverScreen) {
            gameOverScreen.classList.add('show');
        }
    }

    hideGameOver() {
        const gameOverScreen = document.getElementById('game-over-screen');
        if (gameOverScreen) {
            gameOverScreen.classList.remove('show');
        }
    }

    async restartGame() {
        location.reload();
        return;
        
        try {
            // Hide game over screen
            this.hideGameOver();

            // Reset game state
            setPaused(false);

            // Reset UI
            this.uiManager.resetTimer();
            this.uiManager.initializeTimer();

            // Cleanup existing game objects
            this.cleanupGameObjects();

            // Re-initialize game components
            await this.initializeGameComponents();

        } catch (error) {
            console.error('Error restarting game:', error);
            // Show error message to user
            alert('Failed to restart game. Please refresh the page.');
        }
    }

    cleanupGameObjects() {
        // Remove all entities except the root
        const children = this.app.root.children.slice(); // Create a copy of the array
        children.forEach(child => {
            if (child && child !== this.app.root) {
                child.destroy();
            }
        });

        // Clear any existing event listeners
        this.app.mouse.detachAll();
        this.app.keyboard.detachAll();
        this.app.touch.detachAll();
        
        // Clear any running timers or intervals
        // Add any other cleanup needed
    }

    async initializeGameComponents() {
        // Initialize all game components here
        // This should mirror your initial game setup in main.js
        // But without recreating the PlayCanvas application

        // Example (adjust according to your needs):
        const light = new pc.Entity("DirectionalLight");
        light.addComponent("light", {
            type: pc.LIGHTTYPE_DIRECTIONAL,
            color: new pc.Color(1, 1, 1),
            castShadows: true,
            intensity: 1
        });
        light.setEulerAngles(45, 30, 0);
        this.app.root.addChild(light);

        // Initialize player
        const player = new Player(
            this.app, 
            "models/Mage.glb", 
            "textures/mage_texture.png", 
            0.4,
            []
        );

        // Initialize enemy manager
        const enemyManager = new EnemyManager(this.app, player);

        // Initialize magic staff
        const magicStaff = new MagicStaff(this.app, player.entity, enemyManager.getEnemies());
        enemyManager.setWeaponSystem(magicStaff);

        // Initialize map and camera
        const map = new Map(this.app, "textures/grass_texture.jpg", player);
        const cameraHandler = new CameraHandler(this.app, player.entity);

        // Update UI with new player reference
        this.uiManager.updateHPBar(player.health, player.maxHealth);

        return {
            player,
            enemyManager,
            magicStaff,
            map,
            cameraHandler
        };
    }

    getUIManager() {
        return this.uiManager;
    }
}