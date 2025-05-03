import { Enemy } from './Enemy.js';

export class EnemyManager {
    enemies = [];

    // Spawn config
    enemySpawnTimer = 0;
    enemySpawnCooldown = 2;
    spawnDistance = 18;
    spawnRadius = 19;
    minEnemySpacing = 2;
    maxSpawnAttempts = 10;

    enemyKillCounter = 0;

    constructor(app, playerEntity) {
        this.app = app;
        this.playerEntity = playerEntity;

        this._initDifficultyScaling();
    }

    spawnEnemy(modelUrl, textureUrl, scale, isElite = false) {
        const spawnPosition = this._findSpawnPosition();
        const { health, speed, damage } = this._getStatsForType(isElite);

        const enemy = new Enemy(
            this.app,
            modelUrl,
            textureUrl,
            scale,
            this.playerEntity.entity,
            spawnPosition,
            health,
            speed,
            damage
        );

        if (isElite) enemy.markAsElite();

        spawnPosition.y = 2;
        enemy.entity.setPosition(spawnPosition);

        this.enemies.push(enemy);
    }

    _findSpawnPosition() {
        for (let i = 0; i < this.maxSpawnAttempts; i++) {
            const pos = this._randomSpawnPosition();
            if (this._isValidSpawn(pos)) return pos;
        }
        return this._randomSpawnPosition(); // fallback
    }

    _randomSpawnPosition() {
        const playerPos = this.playerEntity.entity.getPosition();
        const angle = Math.random() * Math.PI * 2;
        const dist = this.spawnDistance + Math.random() * this.spawnRadius;

        return new pc.Vec3(
            playerPos.x + Math.cos(angle) * dist,
            playerPos.y,
            playerPos.z + Math.sin(angle) * dist
        );
    }

    _isValidSpawn(pos) {
        return this.enemies.every(enemy =>
            pos.distance(enemy.entity.getPosition()) >= this.minEnemySpacing
        );
    }

    _getStatsForType(isElite) {
        const { health, speed, damage } = this.baseEnemyStats;
        return isElite
            ? {
                  health: health * 6,
                  speed: speed * 1.5,
                  damage: damage * 2,
              }
            : { health, speed, damage };
    }

    _initDifficultyScaling() {
        this.lastUpgradeTime = 0;
        this.nextUpgradeInterval = 30 + Math.random() * 30;

        this.lastEliteSpawnTime = 0;
        this.eliteInterval = 180;

        this.baseEnemyStats = { health: 20, speed: 2, damage: 10 };
    }

    _updateDifficulty(dt) {
        this.lastUpgradeTime += dt;
        this.lastEliteSpawnTime += dt;

        if (this.lastUpgradeTime >= this.nextUpgradeInterval) {
            const stats = this.baseEnemyStats;
            stats.health += 5;
            stats.speed += 0.2;
            stats.damage += 2;

            console.log("⬆️ Enemy difficulty increased!", stats);

            this.lastUpgradeTime = 0;
            this.nextUpgradeInterval = 30 + Math.random() * 30;
        }
    }

    update(dt) {
        this._updateDifficulty(dt);
        this.enemySpawnTimer += dt;

        if (this.lastEliteSpawnTime >= this.eliteInterval) {
            this.spawnEnemy("models/Skeleton_Minion.glb", "textures/skeleton_texture.png", 0.6, true);
            this.lastEliteSpawnTime = 0;
        }

        if (this.enemySpawnTimer >= this.enemySpawnCooldown) {
            this.spawnEnemy("models/Skeleton_Minion.glb", "textures/skeleton_texture.png", 0.4);
            this.enemySpawnTimer = 0;
        }

        this._updateEnemies(dt);
    }

    _updateEnemies(dt) {
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];

            if (!enemy || enemy.entity.position.y < -1) {
                this._removeEnemy(i);
                continue;
            }

            if (!enemy.isAlive && enemy.entity.isReadyForDestruction) {
                this._removeEnemy(i);
                continue;
            }

            enemy.update(dt);
        }
    }

    _removeEnemy(index) {
        const enemy = this.enemies[index];
        if (enemy?.entity) enemy.entity.destroy();
        this.enemies.splice(index, 1);
    }

    getEnemies() {
        return this.enemies;
    }
}