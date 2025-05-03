import { COLLISION_GROUPS } from './CollisionGroups.js';
import { isPaused } from './GameState.js';

export class MagicStaff extends pc.EventHandler {
    // Stats
    fireRate = 1.8;
    fireTimer = 0;
    attackRange = 10;
    speed = 15;
    projectileCount = 1;
    maxProjectiles = 8;
    projectiles = [];

    // Upgrade stuffs
    weaponLevel = 1;
    maxLevel = 16;

    upgradeStats = {
        damage: 5,
        fireRateReduction: 0.2,
    };

    constructor(app, playerEntity, enemies, damage = 10) {
        super();
        Object.assign(this, { app, playerEntity, enemies, damage });
    }

    fireProjectile(target) {
        this.fire('attack');
    
        const projectiles = Array.from({ length: this.projectileCount }, (_, i) =>
            this.spawnSingleProjectile(target, i, this.projectileCount)
        );
    
        this.app.on('update', function moveProjectiles(dt) {
            if (isPaused) return;
    
            for (const p of projectiles) {
                const { entity, direction } = p;
                if (entity?.enabled) {
                    const currentPos = entity.getPosition();
                    const newPos = currentPos.clone().add(direction.clone().mulScalar(this.speed * dt));
                    entity.setPosition(newPos);
                }
            }
        }.bind(this));
    }    

    spawnSingleProjectile(target, index, total) {
        const projectile = new pc.Entity("Projectile");
        projectile.tags.add("projectile");

        projectile.addComponent("model", { type: "sphere" });

        const material = new pc.StandardMaterial();
        material.diffuse = new pc.Color(1, 0, 0);
        material.update();
        projectile.model?.meshInstances.forEach(mi => mi.material = material);

        projectile.addComponent("collision", {
            type: "sphere",
            radius: 0.1,
            group: COLLISION_GROUPS.PROJECTILE,
            mask: COLLISION_GROUPS.ENEMY,
        });

        projectile.addComponent("rigidbody", {
            type: "kinematic",
            group: COLLISION_GROUPS.PROJECTILE,
        });

        projectile.rigidbody.applyGravity = false;

        projectile.setLocalScale(0.15, 0.15, 0.15);
        projectile.enabled = true;

        projectile.collision.on("collisionstart", contact => {
            if (contact.other?.tags?.has("enemy")) {
                contact.other.script?.enemy?.takeDamage(this.damage);
                this.fire('enemyHit');
                projectile.destroy();
            }
        });

        const startPos = this.playerEntity.getPosition().clone().add(new pc.Vec3(0, 0.5, 0));
        projectile.setPosition(startPos);

        let direction = this.computeProjectileDirection(startPos, target, index, total);

        this.app.root.addChild(projectile);

        setTimeout(() => {
            if (projectile.enabled) projectile.destroy();
        }, 3500);

        return { entity: projectile, direction };
    }

    computeProjectileDirection(startPos, target, index, total) {
        let direction = this.playerEntity.forward.clone();

        if (target) {
            const targetPos = target.getPosition().clone().add(new pc.Vec3(0, 0.5, 0));
            direction = targetPos.sub(startPos)
        } else {
            direction = new pc.Vec3(0, 0, 1);
            this.playerEntity.getRotation().transformVector(direction, direction);
        }

        direction.y = 0;
        direction.normalize();

        if (total > 1) {
            const angleSpread = Math.min(60, 10 + (total - 1) * 10);
            const step = angleSpread / (total - 1 || 1);
            const offset = -angleSpread / 2 + step * index;
            const rad = pc.math.DEG_TO_RAD * offset;

            const sin = Math.sin(rad), cos = Math.cos(rad);
            direction = new pc.Vec3(
                direction.x * cos - direction.z * sin,
                0,
                direction.x * sin + direction.z * cos
            ).normalize();
        }

        return direction;
    }

    findNearestEnemy() {
        let nearest = null;
        let minDist = Infinity;

        for (const enemy of this.enemies) {
            if (!enemy.isAlive) continue;

            const dist = this.playerEntity.getPosition().distance(enemy.getEntity().getPosition());
            if (dist < minDist) {
                nearest = enemy;
                minDist = dist;
            }
        }

        return nearest;
    }

    setEnemies(enemies) {
        this.enemies = enemies;
    }

    update(dt) {
        if (isPaused || !this.playerEntity) return;

        this.fireTimer += dt;

        if (this.fireTimer >= this.fireRate) {
            const nearestEnemy = this.findNearestEnemy();
            const distance = nearestEnemy
                ? this.playerEntity.getPosition().distance(nearestEnemy.getEntity().getPosition())
                : Infinity;

            this.fireProjectile(distance < this.attackRange ? nearestEnemy.getEntity() : null);
            this.fireTimer = 0;
        }
    }
}