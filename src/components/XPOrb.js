import { COLLISION_GROUPS } from './CollisionGroups';

export class XPOrb {
    constructor(app, position, xpAmount = 50) {
        this.app = app;
        this.xpAmount = xpAmount;

        // Movement logic
        this.movingToPlayer = false;
        this.moveSpeed = 10;
        this.checkInterval = 0.2;
        this.timer = 0;
        this.playerEntity = null;
        this.boundUpdate = this.update.bind(this);

        // Initialize entity
        this.entity = this._createEntity(position);
        this._setupCollision();
        this._setupPlayerReference();

        // Add entity to the app
        app.root.addChild(this.entity);
        app.on('update', this.boundUpdate);
    }

    _createEntity(position) {
        const entity = new pc.Entity("XPOrb");

        entity.addComponent("model", {
            type: "sphere"
        });

        const material = new pc.StandardMaterial();
        material.emissive = new pc.Color(0, 1, 0.5);
        material.emissiveIntensity = 0.7;
        material.update();

        entity.model.material = material;
        entity.setLocalScale(0.15, 0.15, 0.15);
        entity.setPosition(position.x, 0.2, position.z);

        entity.tags.add('xp-orb');

        return entity;
    }

    _setupCollision() {
        this.entity.addComponent("collision", {
            type: "sphere",
            radius: 0.3,
            trigger: true,
            group: COLLISION_GROUPS.COLLECTIBLE,
            mask: COLLISION_GROUPS.PLAYER
        });

        this.entity.addComponent("rigidbody", {
            type: "kinematic"
        });

        this.entity.collision.on('triggerenter', this._onTriggerEnter, this);
    }

    _setupPlayerReference() {
        const players = this.app.root.findByTag('player');
        if (players.length > 0) {
            this.playerEntity = players[0];
        }
    }

    _onTriggerEnter(otherEntity) {
        if (otherEntity.tags?.has('player') && otherEntity.playerInstance) {
            otherEntity.playerInstance.gainXP(this.xpAmount);
            this._destroy();
        }
    }

    update(dt) {
        if (!this.playerEntity?.playerInstance) return;

        if (this.movingToPlayer) {
            this._moveTowardPlayer(dt);
        } else {
            this.timer += dt;
            if (this.timer >= this.checkInterval) {
                this.timer = 0;
                const distance = this.entity.getPosition().distance(this.playerEntity.getPosition());
                const collectRange = this.playerEntity.playerInstance.collectRange || 5;
                if (distance <= collectRange) {
                    this.movingToPlayer = true;
                }
            }
        }
    }

    _moveTowardPlayer(dt) {
        const orbPos = this.entity.getPosition();
        const targetPos = this.playerEntity.getPosition().clone().add(pc.Vec3.UP.clone().scale(0.5));

        const direction = new pc.Vec3().sub2(targetPos, orbPos).normalize();
        const distance = targetPos.clone().sub(orbPos).length();
        const moveAmount = Math.min(this.moveSpeed * dt, distance);

        orbPos.add(direction.scale(moveAmount));
        this.entity.setPosition(orbPos);
        this.moveSpeed += dt * 15;

        if (distance < 0.5) {
            this.playerEntity.playerInstance.gainXP(this.xpAmount);
            this._destroy();
        }
    }

    _destroy() {
        this.app.off('update', this.boundUpdate);
        this.entity.destroy();
    }

    getEntity() {
        return this.entity;
    }
}