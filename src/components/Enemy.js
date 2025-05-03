import { XPOrb } from './XPOrb.js';
import { COLLISION_GROUPS } from './CollisionGroups.js';

export class Enemy {
    animations = {};
    currentAnim = "Idle";

    app; entity; modelEntity; playerEntity;
    movement = new pc.Vec3();
    lastFacingDirection = new pc.Vec3();
    targetRotation = 0;

    isElite = false;
    isAlive = true;
    attacking = false;

    health; speed; damage;
    attackRange = 0.7;
    attackCooldown = 2;
    attackTimer = 0;

    constructor(app, modelUrl, textureUrl, scale, playerEntity, spawnPosition, health = 20, speed = 2, damage = 10) {
        this.app = app;
        this.playerEntity = playerEntity;
        this.health = health;
        this.speed = speed;
        this.damage = damage;

        this.entity = this._createEntity(spawnPosition);
        this.modelEntity = this._createModelEntity(scale);
        this.entity.addChild(this.modelEntity);

        this._initCollisionAndPhysics();
        this._initEnemyScript();
        this._loadAssets(modelUrl, textureUrl, scale, spawnPosition);

        app.root.addChild(this.entity);
    }

    _createEntity(spawnPos) {
        const entity = new pc.Entity("Enemy");
        entity.tags.add("enemy");
        if (spawnPos) {
            spawnPos.y = 1;
            entity.setPosition(spawnPos);
        }
        return entity;
    }

    _createModelEntity(scale) {
        const model = new pc.Entity("EnemyModel");
        model.setLocalScale(scale, scale, scale);
        model.setLocalPosition(0, -0.4, 0);
        return model;
    }

    _initCollisionAndPhysics() {
        this.entity.addComponent("collision", {
            type: "box",
            halfExtents: new pc.Vec3(0.2, 0.35, 0.2),
            group: COLLISION_GROUPS.ENEMY,
            mask: COLLISION_GROUPS.GROUND | COLLISION_GROUPS.PROJECTILE,
        });

        this.entity.addComponent("rigidbody", {
            type: "dynamic",
            mass: 1,
            friction: 0.9,
            linearDamping: 0.9,
            angularDamping: 1,
            group: COLLISION_GROUPS.ENEMY,
            mask: COLLISION_GROUPS.ENEMY | COLLISION_GROUPS.PROJECTILE | COLLISION_GROUPS.GROUND,
        });
    }

    _initEnemyScript() {
        this.entity.addComponent("script");

        try {
            pc.createScript.get('enemy');
        } catch {
            const EnemyScript = pc.createScript('enemy');
            EnemyScript.prototype.swap = function (old) {
                this.enemyInstance = old.enemyInstance;
            };
            EnemyScript.prototype.initialize = function () {
                this.enemyInstance = this.entity.enemyInstance;
            };
            EnemyScript.prototype.takeDamage = function (damage) {
                this.enemyInstance?.takeDamage(damage);
            };
        }

        this.entity.enemyInstance = this;
        this.entity.script.create('enemy');
    }

    _loadAssets(modelUrl, textureUrl, scale, spawnPosition) {
        this.app.assets.loadFromUrl(modelUrl, "container", (err, asset) => {
            if (err) return console.error("Error loading model:", err);

            this.modelEntity.addComponent("model", {
                type: "asset",
                asset: asset.resource.model
            });

            this.modelEntity.model?.meshInstances.forEach(m => m.castShadow = true);

            const pos = this.entity.getPosition();
            if (pos.y !== 1 || (pos.x === 0 && pos.z === 0)) {
                console.warn("Enemy position reset, restoring spawn position");
                this.entity.setPosition(spawnPosition);
            }

            if (asset.resource.animations) {
                this.modelEntity.addComponent("anim", { activate: true });
                asset.resource.animations.forEach(anim => {
                    this.animations[anim.resource.name] = anim.resource;
                    this.modelEntity.anim?.assignAnimation(anim.resource.name, anim.resource);
                });
                this.playAnimation("Idle");
            }

            this._loadTexture(textureUrl);
        });
    }

    _loadTexture(textureUrl) {
        this.app.assets.loadFromUrl(textureUrl, "texture", (err, asset) => {
            if (err || !asset) return console.error("Error loading texture:", err);

            const material = new pc.StandardMaterial();
            material.diffuseMap = asset.resource;
            material.update();

            this.modelEntity.model?.meshInstances.forEach(m => m.material = material);
        });
    }

    markAsElite() {
        this.isElite = true;
        this.modelEntity.model?.meshInstances.forEach(m => {
            const mat = m.material.clone();
            mat.diffuse.set(
                Math.min(mat.diffuse.r + 0.4, 1.0),
                mat.diffuse.g * 0.6,
                mat.diffuse.b * 0.6
            );
            mat.update();
            m.material = mat;
        });
    }

    takeDamage(dmg) {
        this.health -= dmg;
        if (this.health <= 0) this._handleDeath();
    }

    _handleDeath() {
        if (!this.isAlive) return;
        this.isAlive = false;

        this.entity.collision && (this.entity.collision.enabled = false);
        this.entity.rigidbody && (this.entity.rigidbody.enabled = false);

        const anim = this.animations["Lie_Down"];
        const rotation = this.entity.getEulerAngles().clone();

        if (anim) {
            this.playAnimation("Lie_Down", false);
            const duration = (anim.duration * 1000) / 2;
            const keepRot = () => this.entity?.setEulerAngles(0, rotation.y, 0);

            this.app.on('update', keepRot);
            setTimeout(() => {
                this.app.off('update', keepRot);
                this.entity.isReadyForDestruction = true;
            }, duration);
        } else {
            this.entity.isReadyForDestruction = true;
        }

        const pos = this.entity.getPosition().clone();
        const time = window.gameElapsedTime || 0;
        const baseXP = 50;
        const xp = Math.floor(baseXP * (1 + Math.floor(time / 60) * 0.5));
        new XPOrb(this.app, pos, this.isElite ? xp * 5 : xp);
    }

    playAnimation(name, loop = true) {
        const anim = this.animations[name];
        if (!this.modelEntity?.anim || !anim || this.currentAnim === name) return;

        this.modelEntity.anim.baseLayer.play(name, { loop });
        this.currentAnim = name;

        if (!loop) {
            if (this._animationCompleteCallback)
                this.app.off('update', this._animationCompleteCallback);

            this._animationCompleteCallback = () => {
                const baseLayer = this.modelEntity?.anim?.baseLayer;
                if (!baseLayer) return;
            
                const progress = baseLayer.activeTimeSeconds;
                if (progress >= anim.duration) {
                    this.playAnimation("Idle", true);
                    this.app.off('update', this._animationCompleteCallback);
                    this._animationCompleteCallback = null;
                }
            };
            
            this.app.on('update', this._animationCompleteCallback);
        }
    }

    attackPlayer() {
        if (this.attackTimer < this.attackCooldown || this.attacking) return;

        this.setAttacking(true);
        const dir = this._lookAtPlayer();
        this.entity.setEulerAngles(0, this.targetRotation, 0);
        this.playAnimation("2H_Melee_Attack_Slice", false);

        setTimeout(() => {
            if (this.isAlive && this.playerEntity.script?.player) {
                this.playerEntity.script.player.takeDamage(this.damage);
            }
            this.playAnimation("Idle");
        }, 1000);

        setTimeout(() => {
            this.setAttacking(false);
            this.attackTimer = 0;
        }, 1200);
    }

    chasePlayer(dt) {
        if (!this.entity.rigidbody || !this.isAlive) return;

        const playerPos = this.playerEntity.getPosition();
        const enemyPos = this.entity.getPosition();
        const distance = enemyPos.distance(playerPos);

        const direction = new pc.Vec3().sub2(playerPos, enemyPos).normalize();
        direction.y = 0;

        if (distance <= this.attackRange) {
            this.entity.rigidbody.linearVelocity = pc.Vec3.ZERO.clone();
            if (!this.attacking) {
                this._lookAtPlayer(direction);
                this.attackPlayer();
            }
            this.entity.setEulerAngles(0, this.targetRotation, 0);
            if (!this.attacking) this.playAnimation("Idle");
        } else {
            if (!this.attacking) {
                this._lookAtPlayer(direction);
                const vel = this.entity.rigidbody.linearVelocity;
                const targetVel = new pc.Vec3(direction.x * this.speed, vel.y, direction.z * this.speed);
                const force = new pc.Vec3().sub2(targetVel, vel).scale(this.entity.rigidbody.mass * (1 / dt));
                this.entity.rigidbody.applyForce(force);
                this.playAnimation("Running_A");
            }
            this.entity.setEulerAngles(0, this.targetRotation, 0);
        }

        if (enemyPos.y > 0.1)
            this.entity.rigidbody.applyForce(new pc.Vec3(0, -9.81 * this.entity.rigidbody.mass, 0));

        this.entity.rigidbody.angularFactor = pc.Vec3.ZERO.clone();
        const rot = this.entity.getRotation();
        rot.x = 0;
        rot.z = 0;
        this.entity.setRotation(rot);
    }

    _lookAtPlayer(dirOverride = null) {
        const dir = dirOverride || new pc.Vec3().sub2(this.playerEntity.getPosition(), this.entity.getPosition()).normalize();
        this.lastFacingDirection.copy(dir);
        this.targetRotation = Math.atan2(dir.x, dir.z) * pc.math.RAD_TO_DEG;
        return dir;
    }

    setAttacking(state) {
        this.attacking = state;
        if (!state) this._lookAtPlayer();
    }

    update(dt) {
        this.attackTimer += dt;
        this.chasePlayer(dt);
    }

    getEntity() {
        return this.entity;
    }
}