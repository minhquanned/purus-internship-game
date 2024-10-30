import { MagicStaff } from './WeaponMagicStaff';
import * as pc from 'playcanvas';

export class Player {
    animations = {};
    currentAnim = "Idle";

    // Movement stuff
    movement= new pc.Vec3();
    speed = 2;
    
    // Combat stuff
    health = 100;

    // State
    attacking = false;

    constructor(app, modelUrl, textureUrl, scale, enemies) {
        this.app = app;
        this.entity = new pc.Entity("Player");
        this.enemies = enemies;
        this.magicStaff = new MagicStaff(app, this.entity, this.enemies);

        // Load model and animation
        app.assets.loadFromUrl(modelUrl, "container", (err, asset) => {
            if (err) {
                console.error("Error loading model: ", err);
                return;
            }

            this.entity.addComponent("model", {
                type: "asset",
                asset: asset?.resource.model
            });

            // Edit scale
            this.entity.setLocalScale(scale, scale, scale);

            // Load all animations
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

            this.loadTexture(textureUrl);
        });
        app.root.addChild(this.entity);

        this.addKeyboardControls();
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

            if (this.entity.model && this.entity.model.meshInstances.length > 0) {
                this.entity.model.meshInstances.forEach((meshInstance) => {
                    meshInstance.material = material;
                });
            }
        });
    }

    takeDamage(damage) {
        this.health -= damage;
        console.log("Player health: ", this.health);

        if (this.health <= 0) {
            console.log("Player has been defeated!");
            // this.die();
        }
    }

    die() {
        this.entity.destroy();
    }

    playAnimation(animationName, loop = true) {
        if (this.animations[animationName] && this.currentAnim !== animationName) {
            this.entity.anim?.baseLayer.play(animationName);

            if (!loop) {
                const animDuration = this.entity.anim?.baseLayer.activeStateDuration;
                this.app.on("update", (dt) => {
                    if (this.entity.anim?.baseLayer && animDuration !== undefined && this.entity.anim.baseLayer.activeStateProgress >= animDuration) {
                        this.playAnimation("Idle");
                    }
                });
            }

            this.currentAnim = animationName;
        }
    }

    addKeyboardControls() {
        const keyboard = new pc.Keyboard(window);
        const mouse = new pc.Mouse(this.app.graphicsDevice.canvas);
        mouse.enablePointerLock();

        window.addEventListener("contextmenu", (event) => {
            event.preventDefault();
        });

        this.app.on("update", (dt) => {            
            if (keyboard.isPressed(pc.KEY_W)) this.movement.z -= this.speed * dt;
            if (keyboard.isPressed(pc.KEY_A)) this.movement.x -= this.speed * dt;
            if (keyboard.isPressed(pc.KEY_S)) this.movement.z += this.speed * dt;
            if (keyboard.isPressed(pc.KEY_D)) this.movement.x += this.speed * dt;

            this.entity.translate(this.movement);

            // Rotate the character to the direction of movement
            if (this.movement.length() > 0) {
                const angle = Math.atan2(this.movement.x, this.movement.z);
                this.entity.setEulerAngles(0, angle * pc.math.RAD_TO_DEG, 0);
            }
            this.movement.set(0, 0, 0);

            // Update the animation
            const moved = keyboard.isPressed(pc.KEY_W) || keyboard.isPressed(pc.KEY_S) || keyboard.isPressed(pc.KEY_A) || keyboard.isPressed(pc.KEY_D);
            if (moved && this.currentAnim === "Idle") {
                this.playAnimation("Running_B");
            }
            else if (!moved && this.currentAnim === "Running_B") {
                this.playAnimation("Idle");
            }
        });
    }

    setEnemies(enemies) {
        this.enemies = enemies;
    }

    setAttacking(attacking) {
        this.attacking = attacking;
    }

    update(dt) {
        this.magicStaff.setEnemies(this.enemies);
        this.magicStaff.update(dt);
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