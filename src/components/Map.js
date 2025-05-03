import { COLLISION_GROUPS } from './CollisionGroups.js';

export class Map {
    constructor(app, mapTextureUrl, playerEntity) {
        this.app = app;
        this.playerEntity = playerEntity;
        this.mapMaterial = new pc.StandardMaterial();

        this._createMapEntity();
        this._loadMapTexture(mapTextureUrl);
        this._restrictPlayerWithinBounds();
    }

    _createMapEntity() {
        this.entity = new pc.Entity("Map");

        this.entity.addComponent("model", { type: "plane" });
        this.entity.setLocalScale(400, 1, 400);

        this.entity.addComponent("collision", {
            type: "box",
            halfExtents: new pc.Vec3(400, 0.1, 400),
            group: COLLISION_GROUPS.GROUND,
            mask: COLLISION_GROUPS.ENEMY | COLLISION_GROUPS.PLAYER,
        });

        this.entity.addComponent("rigidbody", {
            type: "static",
            restitution: 0.5,
            friction: 0.6,
            enable: true,
            group: COLLISION_GROUPS.GROUND,
            mask: COLLISION_GROUPS.ENEMY | COLLISION_GROUPS.PLAYER,
        });

        this.app.root.addChild(this.entity);
    }

    _loadMapTexture(textureUrl) {
        this.app.assets.loadFromUrl(textureUrl, "texture", (err, asset) => {
            if (err) return console.error("Error loading texture:", err);
            if (!asset?.resource) return;

            const tex = asset.resource;
            tex.addressU = pc.ADDRESS_REPEAT;
            tex.addressV = pc.ADDRESS_REPEAT;

            this.mapMaterial.diffuseMap = tex;
            this.mapMaterial.diffuseMapTiling = new pc.Vec2(50, 50);
            this.mapMaterial.update();

            const mesh = this.entity.model?.meshInstances?.[0];
            if (mesh) {
                mesh.material = this.mapMaterial;
            } else {
                console.error("Map model or mesh instance not found.");
            }
        });
    }

    _restrictPlayerWithinBounds() {
        this.app.on("update", () => {
            const pos = this.playerEntity.getPosition();
            const clampedX = Math.max(-100, Math.min(100, pos.x));
            const clampedZ = Math.max(-100, Math.min(100, pos.z));
            if (clampedX !== pos.x || clampedZ !== pos.z) {
                this.playerEntity.setPosition(clampedX, pos.y, clampedZ);
            }
        });
    }
}