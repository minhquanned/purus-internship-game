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
    attackRange = 0.7;
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

        // Track rotation
        this.lastFacingDirection = new pc.Vec3();
        this.targetRotation = 0;
        
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
        if (!this.isAlive) return; // Prevent multiple death calls
    
        this.isAlive = false;

        // Disable collision and physics during death animation
        if (this.entity.collision) {
            this.entity.collision.enabled = false;
        }
        if (this.entity.rigidbody) {
            this.entity.rigidbody.enabled = false;
        }

        // Add death animation if available
        if (this.animations["Lie_Down"]) {
            // Store current rotation before death
            const currentRotation = this.entity.getEulerAngles().clone();

            // Play the death animation without looping
            this.playAnimation("Lie_Down", false);
            
            // Calculate animation duration and add a small buffer
            const deathAnim = this.animations["Lie_Down"];
            const animationDuration = deathAnim ? (deathAnim.duration * 1000) * 1/2 : 1000;

            // Lock rotation during death animation
            const maintainRotation = () => {
                if (this.entity && !this.entity.isReadyForDestruction) {
                    // Keep the stored rotation
                    this.entity.setEulerAngles(0, currentRotation.y, 0);
                }
            };
            
            // Add update listener for rotation
            this.app.on('update', maintainRotation);
            
            // Set destruction flag after animation completes
            setTimeout(() => {
                if (this.entity) {
                    this.app.off('update', maintainRotation);
                    this.entity.isReadyForDestruction = true;
                }
            }, animationDuration);
        } else {
            // If no death animation, mark for immediate destruction
            this.entity.isReadyForDestruction = true;
        }
    }

    playAnimation(animationName, loop = true) {
        if (!this.modelEntity?.anim || !this.animations[animationName]) {
            return;
        }

        if (this.currentAnim !== animationName) {
            // Stop current animation
            if (this.currentAnim) {
                // this.modelEntity.anim.baseLayer.stop();
            }

            // Play new animation
            this.modelEntity.anim.baseLayer.play(animationName, {
                loop: loop
            });

            this.currentAnim = animationName;

            // Handle non-looping animations
            if (!loop) {
                const anim = this.animations[animationName];
                if (anim) {
                    // Remove any existing animation complete listener
                    if (this._animationCompleteCallback) {
                        this.app.off('update', this._animationCompleteCallback);
                    }

                    // Create new animation complete listener
                    this._animationCompleteCallback = (dt) => {
                        if (this.modelEntity?.anim?.baseLayer) {
                            const progress = this.modelEntity.anim.baseLayer.activeTimeSeconds;
                            if (progress >= anim.duration) {
                                this.playAnimation("Idle", true);
                                this.app.off('update', this._animationCompleteCallback);
                                this._animationCompleteCallback = null;
                            }
                        }
                    };

                    this.app.on('update', this._animationCompleteCallback);
                }
            }
        }
    }

    attackPlayer() {
        if (this.attackTimer >= this.attackCooldown && !this.attacking) {
            // Lock in the current facing direction when starting attack
            this.setAttacking(true);
            
            // Store current direction to player for the attack
            const playerPos = this.playerEntity.getPosition();
            const enemyPos = this.entity.getPosition();
            this.lastFacingDirection = new pc.Vec3()
                .sub2(playerPos, enemyPos)
                .normalize();
            
            // Calculate and store the target rotation
            this.targetRotation = Math.atan2(this.lastFacingDirection.x, this.lastFacingDirection.z) * pc.math.RAD_TO_DEG;
            
            // Set the rotation immediately to face the player
            this.entity.setEulerAngles(0, this.targetRotation, 0);
            
            // Play attack animation
            this.playAnimation("2H_Melee_Attack_Slice", false);
            
            // Apply damage after a delay to match animation
            setTimeout(() => {
                if (this.isAlive && this.playerEntity.script && this.playerEntity.script.player) {
                    this.playerEntity.script.player.takeDamage(10);
                }
                this.playAnimation("Idle", true);
            }, 1000);

            
            // Reset attack state after animation
            setTimeout(() => {
                this.setAttacking(false);
                this.attackTimer = 0;
            }, 1200);
        }
    }

    chasePlayer(dt) {
        if (!this.entity.rigidbody || !this.isAlive) return;

        const playerPos = this.playerEntity.getPosition();
        const enemyPos = this.entity.getPosition();
        const distance = enemyPos.distance(playerPos);

        // Calculate direction to player
        const direction = new pc.Vec3()
            .sub2(playerPos, enemyPos)
            .normalize();
        direction.y = 0; // Keep movement horizontal

        if (distance <= this.attackRange) {
            // Stop movement when in attack range
            this.entity.rigidbody.linearVelocity = new pc.Vec3(0, 0, 0);
            
            if (!this.attacking) {
                // Only update rotation and start attack if not already attacking
                this.lastFacingDirection.copy(direction);
                this.targetRotation = Math.atan2(direction.x, direction.z) * pc.math.RAD_TO_DEG;
                this.entity.setEulerAngles(0, this.targetRotation, 0);
                this.attackPlayer();
            } else {
                // During attack, maintain the stored rotation
                this.entity.setEulerAngles(0, this.targetRotation, 0);
            }

            if (!this.attacking) {
                this.playAnimation("Idle");
            }
        } else {
            if (!this.attacking && this.isAlive) {
                // Update rotation and movement only when not attacking
                this.lastFacingDirection.copy(direction);
                this.targetRotation = Math.atan2(direction.x, direction.z) * pc.math.RAD_TO_DEG;
                this.entity.setEulerAngles(0, this.targetRotation, 0);

                // Apply movement force
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
                this.playAnimation("Running_A");
            } else {
                // During attack, maintain the stored rotation
                this.entity.setEulerAngles(0, this.targetRotation, 0);
            }
        }

        // Apply gravity and keep upright
        if (enemyPos.y > 0.1) {
            this.entity.rigidbody.applyForce(new pc.Vec3(0, -9.81 * this.entity.rigidbody.mass, 0));
        }

        // Lock rotation axes we don't want to change
        this.entity.rigidbody.angularFactor = new pc.Vec3(0, 0, 0);
        const rotation = this.entity.getRotation();
        rotation.x = 0;
        rotation.z = 0;
        this.entity.setRotation(rotation);
    }

    setAttacking(attacking) {
        this.attacking = attacking;
        // When attack ends, immediately update rotation to face player
        if (!attacking) {
            const playerPos = this.playerEntity.getPosition();
            const enemyPos = this.entity.getPosition();
            const direction = new pc.Vec3()
                .sub2(playerPos, enemyPos)
                .normalize();
            this.lastFacingDirection.copy(direction);
            this.targetRotation = Math.atan2(direction.x, direction.z) * pc.math.RAD_TO_DEG;
        }
    }

    update(dt) {
        this.attackTimer += dt;
        this.chasePlayer(dt);
    }

    getEntity() {
        return this.entity;
    }
}