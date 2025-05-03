import { COLLISION_GROUPS } from './CollisionGroups';
import { isPaused } from './GameState';

export class MagicBox extends pc.EventHandler {
    constructor(app, playerEntity, enemies, damage = 10, count = 3, radius = 1.5) {
        super();
        this.app = app;
        this.playerEntity = playerEntity;
        this.enemies = enemies;
        this.damage = damage;
        this.projectileCount = count;
        this.radius = radius;
        this.projectiles = [];
        this.rotationSpeed = 1;
        this.angleOffset = Math.random() * Math.PI * 2;

        this.initProjectiles();
        this.app.on('update', this.update.bind(this));
    }

    initProjectiles() {
        this.projectiles.forEach(p => p.destroy());
        this.projectiles = [];

        for (let i = 0; i < this.projectileCount; i++) {
            const p = this._createProjectile(i);
            this.projectiles.push(p);
            this.app.root.addChild(p);
        }
    }

    _createProjectile(index) {
        const projectile = new pc.Entity(`MagicBoxProjectile_${index}`);
        projectile.tags.add("projectile");

        projectile.addComponent("model", { type: "box" });
        projectile.setLocalScale(0.2, 0.2, 0.2);

        const mat = new pc.StandardMaterial();
        mat.diffuse = new pc.Color(0.8, 0.67, 0.49);
        mat.update();
        projectile.model?.meshInstances.forEach(m => m.material = mat);

        projectile.addComponent("collision", {
            type: "sphere",
            radius: 0.2,
            group: COLLISION_GROUPS.PROJECTILE,
            mask: COLLISION_GROUPS.ENEMY
        });

        projectile.addComponent("rigidbody", {
            type: "kinematic",
            group: COLLISION_GROUPS.PROJECTILE
        });

        const hitHandler = (contact) => this._onHit(contact);
        projectile.collision.on("collisionstart", hitHandler);
        projectile.collision.on("collisionstay", hitHandler);

        return projectile;
    }

    _onHit(contact) {
        const enemy = contact.other?.script?.enemy;
        if (!enemy) return;

        enemy.takeDamage(this.damage);
        this.fire('enemyHit');

        const enemyEntity = contact.other;
        const playerPos = this.playerEntity.getPosition().clone();
        const enemyPos = enemyEntity.getPosition().clone();

        const pushDir = new pc.Vec3().sub2(enemyPos, playerPos).normalize();
        const newPos = enemyPos.add(pushDir.scale(0.25));
        enemyEntity.rigidbody.teleport(newPos, enemyEntity.getRotation());
    }

    update(dt) {
        if (isPaused || !this.playerEntity) return;

        this.angleOffset += dt * this.rotationSpeed;

        const center = this.playerEntity.getPosition();
        const height = center.y + 0.5;
        const angleStep = (2 * Math.PI) / this.projectileCount;

        for (let i = 0; i < this.projectiles.length; i++) {
            const angle = this.angleOffset + i * angleStep;
            const x = center.x + this.radius * Math.cos(angle);
            const z = center.z + this.radius * Math.sin(angle);

            const projectile = this.projectiles[i];
            projectile.setPosition(x, height, z);
            projectile.setEulerAngles(angle * 30, angle * 45, angle * 60);
        }
    }
}