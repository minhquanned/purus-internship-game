import * as pc from 'playcanvas';
import { Enemy } from './Enemy';

export class MagicStaff extends pc.EventHandler {
    fireRate = 1.8;
    fireTimer = 0;
    attackRange = 10;
    speed = 15;
    projectiles = [];

    // Upgrade stuffs
    currentLevel = 1;
    maxLevel = 20;
    killsNeededForUpgrade = 15;

    upgradeStats = {
        damage: 5,
        fireRateReduction: 0.2,
    }

    static COLLISION_PROJECTILE = 8;

    constructor(app, playerEntity, enemies, damage = 10) {
        super();
        this.app = app;
        this.playerEntity = playerEntity;
        this.enemies = enemies;
        this.damage = damage;
    }

    fireProjectile(target) {
        this.fire('attack');

        const projectile = new pc.Entity("Projectile");
        projectile.tags.add("projectile");
        
        // Add components manually instead of cloning
        projectile.addComponent("model", {
            type: "sphere"
        });

        // Add material
        const material = new pc.StandardMaterial();
        material.diffuse = new pc.Color(1, 0, 0);
        material.update();
        projectile.model?.meshInstances.forEach((meshInstance) => {
            meshInstance.material = material;
        });

        // Add collision with explicit group and mask
        projectile.addComponent("collision", {
            type: "sphere",
            radius: 0.1,
            group: MagicStaff.COLLISION_PROJECTILE,
            mask: Enemy.COLLISION_ENEMY,
            trigger: true
        });

        // Add rigidbody
        projectile.addComponent("rigidbody", {
            type: "dynamic",
            mass: 1,
            linearDamping: 0,
            angularDamping: 0,
            friction: 0,
            restitution: 0
        });

        projectile.setLocalScale(0.15, 0.15, 0.15);
        projectile.enabled = true;

        projectile.collision.on("collisionstart", (contact) => {
            
            if (contact.other?.tags?.has("enemy")) {
                if (contact.other.script?.enemy) {
                    this.fire('enemyHit');
                    contact.other.script.enemy.takeDamage(this.damage);
                }
                projectile.destroy();
                this.app.off("update", movementFn);
            }
        });

        const startPos = this.playerEntity.getPosition().clone().add(new pc.Vec3(0, 0.5, 0));
        projectile.setPosition(startPos);

        let direction;
        if (target) {
            const targetPos = target.getPosition().clone().add(new pc.Vec3(0, 0.5, 0));
            direction = new pc.Vec3().sub2(targetPos, startPos).normalize();
            if (direction.length() === 0) {
                direction = this.playerEntity.forward.clone().mulScalar(-1).normalize();
            }
        } else {
            direction = this.playerEntity.forward.clone().mulScalar(-1).normalize();
        }

        this.speed = 15;

        // Update using rigidbody
        const movementFn = (dt) => {
            if (!projectile.enabled) {
                this.app.off("update", movementFn);
                return;
            }

            const velocity = direction.clone().mulScalar(this.speed);
            projectile.rigidbody.linearVelocity = velocity;

            const currentPos = projectile.getPosition();
            if (currentPos.length() > 400) {
                projectile.destroy();
                this.app.off("update", movementFn);
            }
        };

        this.app.on("update", movementFn);

        // Add to scene
        this.app.root.addChild(projectile);

        // Cleanup after delay
        setTimeout(() => {
            if (projectile.enabled) {
                projectile.destroy();
                this.app.off("update", movementFn);
            }
        }, 3500);
    }

    findNearestEnemy() {
        let nearestEnemy = null;
        let nearestDistance = Infinity;

        for (const enemy of this.enemies) {
            if (!enemy.isAlive) {
                continue;
            }

            const distance = this.playerEntity.getPosition().distance(enemy.getEntity().getPosition());
            if (distance < nearestDistance) {
                nearestEnemy = enemy;
                nearestDistance = distance;
            }
        }

        return nearestEnemy;
    }

    checkForUpgrade(enemyKillCount) {
        if (this.currentLevel >= this.maxLevel) {
            return;
        }

        if (enemyKillCount % this.killsNeededForUpgrade === 0) {
            this.upgradeWeapon();
        }
    }

    upgradeWeapon() {
        if (this.currentLevel >= this.maxLevel) {
            console.log("Weapon already at maximum level!");
            return;
        }

        this.currentLevel++;
        
        this.damage += this.upgradeStats.damage;
        this.fireRate = Math.max(0.2, this.fireRate - this.upgradeStats.fireRateReduction);
    }

    setEnemies(enemies) {
        this.enemies = enemies;
    }

    update(dt) {
        this.fireTimer += dt;

        if (this.fireTimer >= this.fireRate) {
            const nearestEnemy = this.findNearestEnemy();
            const distance = nearestEnemy ? 
                this.playerEntity.getPosition().distance(nearestEnemy.getEntity().getPosition()) : 
                Infinity;
                
            if (distance < this.attackRange) {
                this.fireProjectile(nearestEnemy.getEntity());
            } else {
                this.fireProjectile(null);
            }
            this.fireTimer = 0;
        }
    }
}