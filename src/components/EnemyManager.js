import * as pc from 'playcanvas';
import { Enemy } from './Enemy';

export class EnemyManager {
    enemies = [];

    // Spawn settings
    enemySpawnTimer = 0;
    enemySpawnCooldown = 2;
    spawnDistance = 15;
    spawnRadius = 16;
    minEnemySpacing = 2;
    maxSpawnAttempts = 10;
    
    enemyKillCounter = 0;

    constructor(app, playerEntity) {
        this.app = app;
        this.playerEntity = playerEntity;
    }

    spawnEnemy(modelUrl, textureUrl, scale) {
        let spawnPosition = null;
        let attempts = 0;

        while (attempts < this.maxSpawnAttempts) {
            const testPosition = this.getRandomSpawnPosition();
            if (this.isValidSpawnPosition(testPosition)) {
                spawnPosition = testPosition;
                break;
            }
            attempts++;
        }

        // If cannot find a valid position, use the last position
        if (!spawnPosition) {
            spawnPosition = this.getRandomSpawnPosition();
        }

        const enemy = new Enemy(this.app, modelUrl, textureUrl, scale, this.playerEntity.entity, spawnPosition);
        
        spawnPosition.y = 1;
        enemy.entity.setPosition(spawnPosition);
        
        this.enemies.push(enemy);
    }

    isValidSpawnPosition(position) {
        // Check distance from all existing enemies
        for (const enemy of this.enemies) {
            const enemyPos = enemy.entity.getPosition();
            const distance = position.distance(enemyPos);
            
            if (distance < this.minEnemySpacing) {
                return false;
            }
        }
        return true;
    }

    getRandomSpawnPosition() {
        const playerPos = this.playerEntity.entity.getPosition();
        const randomAngle = Math.random() * Math.PI * 2;
        
        const randomDistance = this.spawnDistance + (Math.random() * this.spawnRadius);
        
        const spawnX = playerPos.x + (Math.cos(randomAngle) * randomDistance);
        const spawnZ = playerPos.z + (Math.sin(randomAngle) * randomDistance);
        
        return new pc.Vec3(spawnX, playerPos.y, spawnZ);
    }

    update(dt) {
        this.enemySpawnTimer += dt;
        if (this.enemySpawnTimer >= this.enemySpawnCooldown) {
            this.spawnEnemy("../../../assets/models/Skeleton_Minion.glb", "../../../assets/textures/skeleton_texture.png", 0.4);
            this.enemySpawnTimer = 0;
        }

        // Update and clean up enemies
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            if (enemy.entity.position.y < -1 || !enemy) {
                this.enemies.splice(i, 1);
                enemy.entity.destroy();
            } else if (!enemy.isAlive) {
                this.enemies.splice(i, 1);
                enemy.entity.destroy();
                this.enemyKillCounter++;
            } else {
                enemy.update(dt);
            }
        }
        // console.log(this.enemies);
    }

    getEnemies() {
        return this.enemies;
    }
}