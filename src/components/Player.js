import * as pc from 'playcanvas';
import { isPaused, setPaused } from './GameState';
import { COLLISION_GROUPS } from './CollisionGroups';

export class Player {
    animations = {};
    currentAnim = "Idle";

    movement = new pc.Vec3();
    speed = 2;
    health = 100;
    maxHealth = 100;
    collectRange = 1.5;

    xp = 0;
    level = 1;
    xpToLevelUp = 50;

    attacking = false;
    isAlive = true;

    eventHandlers = {};

    constructor(app, modelUrl, textureUrl, scale, enemies) {
        this.app = app;
        this.enemies = enemies;
        this.lastDirection = 0;

        this.entity = new pc.Entity("Player");
        this.entity.tags.add("player");
        this.entity.setPosition(0, 1, 0);

        this._initPhysics();
        this._createPlayerScript();
        this._loadModelAndAnimations(modelUrl, textureUrl, scale);

        app.root.addChild(this.entity);
        this._addKeyboardControls();
    }

    _initPhysics() {
        this.entity.addComponent("collision", {
            type: "box",
            halfExtents: new pc.Vec3(0.2, 0.1, 0.2),
            group: COLLISION_GROUPS.PLAYER,
            mask: COLLISION_GROUPS.COLLECTIBLE | COLLISION_GROUPS.GROUND,
        });

        this.entity.addComponent("rigidbody", {
            type: "dynamic",
            mass: 1,
            friction: 0.9,
            linearDamping: 0.9,
            angularDamping: 0.9,
            group: COLLISION_GROUPS.PLAYER,
            mask: COLLISION_GROUPS.ENEMY | COLLISION_GROUPS.PROJECTILE | COLLISION_GROUPS.GROUND,
        });

        this.entity.rigidbody.angularFactor = new pc.Vec3(0, 1, 0);
    }

    _createPlayerScript() {
        this.entity.addComponent("script");

        try {
            pc.createScript.get('player');
        } catch {
            const PlayerScript = pc.createScript('player');

            PlayerScript.prototype.swap = function (old) {
                this.playerInstance = old.playerInstance;
            };
            PlayerScript.prototype.initialize = function () {
                this.playerInstance = this.entity.playerInstance;
            };
            PlayerScript.prototype.takeDamage = function (damage) {
                this.playerInstance?.takeDamage(damage);
            };
        }

        this.entity.playerInstance = this;
        this.entity.script.create('player');
    }

    _loadModelAndAnimations(modelUrl, textureUrl, scale) {
        this.app.assets.loadFromUrl(modelUrl, "container", (err, asset) => {
            if (err) {
                console.error("Error loading model: ", err);
                return;
            }

            this.entity.addComponent("model", {
                type: "asset",
                asset: asset?.resource.model
            });

            this.entity.setLocalScale(scale, scale, scale);

            if (asset?.resource.animations) {
                this.entity.addComponent("anim", {
                    activate: true,
                });

                asset.resource.animations.forEach((anim) => {
                    this.animations[anim.resource.name] = anim.resource;
                    this.entity.anim?.assignAnimation(anim.resource.name, anim.resource);
                });
                this.currentAnim = "Idle";
                this.entity.anim?.baseLayer.play("Idle");
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

            this.entity.model?.meshInstances.forEach(m => m.material = material);
        });
    }

    takeDamage(dmg) {
        if (!this.isAlive) return;

        this.health -= dmg;
        console.log("Player took damage! Health:", this.health);

        if (this.health <= 0) {
            console.log("Player has been defeated!");
            this._die();
        }
    }

    _die() {
        if (this.animations["Lie_Down"]) {
            this.playAnimation("Lie_Down", false);
            this.isAlive = false;

            setTimeout(() => {
                window.gameManager.showGameOver();
                this.entity.destroy();
                setPaused(true);
            }, 2000);
        } else {
            window.gameManager.showGameOver();
            this.entity.destroy();
            setPaused(true);
        }
    }

    gainXP(amount) {
        this.xp += amount;
        console.log(`💰 Gained ${amount} XP. Total XP: ${this.xp}`);

        while (this.xp >= this.xpToLevelUp) this._levelUp();
        this._updateXPUI();
    }

    _levelUp() {
        this.level++;
        this.xp -= this.xpToLevelUp;
        this.xpToLevelUp = Math.floor(this.xpToLevelUp * 1.2);
        this.health = this.maxHealth;

        console.log(`🎉 Level Up! Now level ${this.level}`);
        this.fire('levelup');
    }

    playAnimation(name, loop = true) {
        if (!this.animations[name] || this.currentAnim === name) return;

        this.entity.anim?.baseLayer.play(name, { loop });
        this.currentAnim = name;

        if (!loop) {
            const anim = this.animations[name];
            const check = () => {
                const base = this.entity.anim?.baseLayer;
                if (base && base.activeTimeSeconds >= anim.duration) {
                    this.playAnimation("Idle");
                    this.app.off("update", check);
                }
            };
            this.app.on("update", check);
        }
    }

    _addKeyboardControls() {
        const keyboard = new pc.Keyboard(window);
        window.addEventListener("contextmenu", e => e.preventDefault());

        this.app.on("update", (dt) => {
            if (isPaused || !this.isAlive) return;

            const input = new pc.Vec3();
            if (keyboard.isPressed(pc.KEY_W)) input.z -= 1;
            if (keyboard.isPressed(pc.KEY_S)) input.z += 1;
            if (keyboard.isPressed(pc.KEY_A)) input.x -= 1;
            if (keyboard.isPressed(pc.KEY_D)) input.x += 1;

            const isMoving = input.lengthSq() > 0.01;
            if (isMoving) {
                input.normalize().scale(this.speed);
                this.lastDirection = Math.atan2(input.x, input.z) * pc.math.RAD_TO_DEG;
            }

            this.entity.setEulerAngles(0, this.lastDirection, 0);

            const velY = this.entity.rigidbody.linearVelocity.y;
            this.entity.rigidbody.linearVelocity = new pc.Vec3(input.x, velY, input.z);

            if (this.entity.getPosition().y > 0.1) {
                this.entity.rigidbody.applyForce(new pc.Vec3(0, -9.81 * this.entity.rigidbody.mass, 0));
            }

            if (isMoving && this.currentAnim === "Idle") {
                this.playAnimation("Running_B");
            } else if (!isMoving && this.currentAnim === "Running_B") {
                this.playAnimation("Idle");
            }
        });
    }

    // Custom Event System
    on(event, callback) {
        this.eventHandlers[event] = this.eventHandlers[event] || [];
        this.eventHandlers[event].push(callback);
    }

    fire(event, data) {
        this.eventHandlers[event]?.forEach(cb => cb(data));
    }

    _updateXPUI() {
        document.dispatchEvent(new CustomEvent('player:xpUpdated', {
            detail: {
                xp: this.xp,
                xpToLevelUp: this.xpToLevelUp,
                level: this.level
            }
        }));
    }

    update() {
        if (this.health > this.maxHealth) this.health = this.maxHealth;
    }

    setEnemies(enemies) {
        this.enemies = enemies;
    }

    setAttacking(attacking) {
        this.attacking = attacking;
    }

    getEntity() {
        return this.entity;
    }

    getPosition() {
        return this.entity.getPosition();
    }

    setPosition(x, y, z) {
        this.entity.setPosition(x, y, z);
    }
}