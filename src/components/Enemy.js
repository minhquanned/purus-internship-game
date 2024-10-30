import * as pc from 'playcanvas';
import { MagicStaff } from './WeaponMagicStaff';

export class Enemy {
    animations = {};
    currentAnim = "Idle";
    
    // Movement stuff
    movement = new pc.Vec3();
    speed = 2;

    // Combat stuff
    health = 20;
    attackRange = 0.6;
    attackCooldown = 2;
    attackTimer = 0;

    // State
    isAlive = true;
    attacking = false;

    // Collision groups
    static COLLISION_GROUND = 1;
    static COLLISION_ENEMY = 2;

    constructor(app, modelUrl, textureUrl, scale, playerEntity, spawnPosition, health = 20, speed = 2, damage = 10) {
        this.app = app;
        this.playerEntity = playerEntity;
        this.health = health;
        
        // Create main entity container
        this.entity = new pc.Entity("Enemy");
        this.entity.tags.add("enemy");

        if (spawnPosition) {
            spawnPosition.y = 1;
            this.entity.setPosition(spawnPosition);
        }

        // Create a child entity for model
        this.modelEntity = new pc.Entity("EnemyModel");
        this.entity.addChild(this.modelEntity);

        // Add collision to main entity with trigger
        this.entity.addComponent("collision", {
            type: "box",
            halfExtents: new pc.Vec3(0.2, 0.35, 0.2),
            group: Enemy.COLLISION_ENEMY,
            mask: Enemy.COLLISION_GROUND | MagicStaff.COLLISION_PROJECTILE,
        });
        this.entity.collision.enabled = true;

        // Add rigidbody to main entity
        this.entity.addComponent("rigidbody", {
            type: "dynamic",
            mass: 1,
            friction: 0.9,
            linearDamping: 0.9,
            angularDamping: 1,
            enable: true,
        });

        // Add script component and create enemy script
        this.entity.addComponent("script");

        try {
            pc.createScript.get('enemy');
        } catch (e) {
            const EnemyScript = pc.createScript('enemy');
            
            // Define the swap method for hot reloading
            EnemyScript.prototype.swap = function(old) {
                this.enemyInstance = old.enemyInstance;
            };

            EnemyScript.prototype.initialize = function() {
                this.enemyInstance = this.entity.enemyInstance;
            };

            EnemyScript.prototype.takeDamage = function(damage) {
                if (this.enemyInstance) {
                    this.enemyInstance.takeDamage(damage);
                }
            };
        }
        
        this.entity.enemyInstance = this;
        this.entity.script.create('enemy');

        // Rest of the constructor remains the same...
        app.assets.loadFromUrl(modelUrl, "container", (err, asset) => {
            if (err) {
                console.error("Error loading model: ", err);
                return;
            }

            this.modelEntity.addComponent("model", {
                type: "asset",
                asset: asset?.resource.model
            });

            this.modelEntity.model?.meshInstances.forEach((meshInstance) => {
                meshInstance.castShadow = true;
            });

            this.modelEntity.setLocalScale(scale, scale, scale);
            this.modelEntity.setLocalPosition(0, -0.4, 0);

            // Verify position after model loading
            const currentPos = this.entity.getPosition();
            if (currentPos.y !== 1 || (currentPos.x === 0 && currentPos.z === 0)) {
                console.warn("Enemy position reset detected, restoring to spawn position");
                this.entity.setPosition(spawnPosition);
            }

            if (asset?.resource.animations) {
                this.modelEntity.addComponent("anim", {
                    activate: true,
                });

                asset.resource.animations.forEach((anim) => {
                    this.animations[anim.resource.name] = anim.resource;
                    this.modelEntity.anim?.assignAnimation(anim.resource.name, anim.resource);
                });

                this.playAnimation("Idle");
            }

            this.loadTexture(textureUrl);
        });
        
        app.root.addChild(this.entity);
    }

    loadTexture(textureUrl) {
        this.app.assets.loadFromUrl(textureUrl, "texture", (err, asset) => {
            if (err || !asset) {
                console.error("Error loading texture: ", err);
                return;
            }

            const material = new pc.StandardMaterial();
            material.diffuseMap = asset.resource;
            material.update();

            if (this.modelEntity.model && this.modelEntity.model.meshInstances.length > 0) {
                this.modelEntity.model.meshInstances.forEach((meshInstance) => {
                    meshInstance.material = material;
                });
            }
        });
    }

    takeDamage(damage) {
        this.health -= damage;
        console.log("Enemy health: ", this.health);

        if (this.health <= 0) {
            this.death();
        }
    }

    death() {
        console.log("Enemy died!");
        this.isAlive = false;
        this.entity.destroy();
    }

    playAnimation(animationName, loop = true) {
        if (this.animations[animationName] && this.currentAnim !== animationName) {
            this.modelEntity.anim?.baseLayer.play(animationName);

            if (!loop) {
                const animDuration = this.modelEntity.anim?.baseLayer.activeStateDuration;
                this.app.on("update", (dt) => {
                    if (this.modelEntity.anim?.baseLayer && animDuration !== undefined && this.modelEntity.anim.baseLayer.activeStateProgress >= animDuration) {
                        this.playAnimation("Idle");
                    }
                });
            }

            this.currentAnim = animationName;
        }
    }

    attackPlayer() {
        if (this.attackTimer >= this.attackCooldown) {
            this.setAttacking(true);
            // this.playerEntity.takeDamage(this.damage);
            this.playAnimation("2H_Melee_Attack_Slice", false);

            // Debug
            console.log("Enemy attack!");
            console.log("Player health: ", this.playerEntity.health);

            setTimeout(() => {
                this.setAttacking(false);
            }, 1200);

            this.attackTimer = 0;
        }
    }

    chasePlayer(dt) {
        if (!this.entity.rigidbody) return;

        const playerPos = this.playerEntity.getPosition();
        const enemyPos = this.entity.getPosition();
        const distance = enemyPos.distance(playerPos);

        // Calculate direction to player
        const direction = new pc.Vec3().sub2(playerPos, enemyPos).normalize();
        direction.y = 0; // Keep movement horizontal

        if (distance <= this.attackRange) {
            this.attackPlayer();
            // Stop movement when attacking
            this.entity.rigidbody.linearVelocity = new pc.Vec3(0, 0, 0);
        } else if (!this.attacking) {
            // Only update movement if not attacking
            const currentVel = this.entity.rigidbody.linearVelocity;
            
            const targetVelocity = new pc.Vec3(
                direction.x * this.speed,
                currentVel.y,
                direction.z * this.speed
            );

            const velocityChange = new pc.Vec3().sub2(targetVelocity, currentVel);
            const force = new pc.Vec3(
                velocityChange.x * this.entity.rigidbody.mass * (1/dt),
                0,
                velocityChange.z * this.entity.rigidbody.mass * (1/dt)
            );

            this.entity.rigidbody.applyForce(force);
        }

        // Update rotation based on state
        if (!this.attacking) {
            if (distance > this.attackRange) {
                const angle = Math.atan2(direction.x, direction.z);
                this.entity.setEulerAngles(0, angle * pc.math.RAD_TO_DEG, 0);
                this.playAnimation("Running_A");
            } else {
                this.playAnimation("Idle_B");
            }
            this.lastFacingDirection = direction;
        } else {
            const angle = Math.atan2(this.lastFacingDirection.x, this.lastFacingDirection.z);
            this.entity.setEulerAngles(0, angle * pc.math.RAD_TO_DEG, 0);
        }

        // Keep upright
        const rotation = this.entity.getRotation();
        rotation.x = 0;
        rotation.z = 0;
        this.entity.setRotation(rotation);

        if (enemyPos.y > 0.1) {
            this.entity.rigidbody.applyForce(new pc.Vec3(0, -9.81 * this.entity.rigidbody.mass, 0));
        }

        // Lock the rotation on the y-axis
        this.entity.rigidbody.angularFactor = new pc.Vec3(0, 0, 0);
    }

    setAttacking(attacking) {
        this.attacking = attacking;
    }

    update(dt) {
        this.attackTimer += dt;
        this.chasePlayer(dt);
    }

    getEntity() {
        return this.entity;
    }
}