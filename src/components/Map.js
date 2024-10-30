import * as pc from 'playcanvas';
import { Enemy } from './Enemy';

export class Map {
    mapMaterial = new pc.StandardMaterial();

    constructor(app, mapTextureUrl, playerEntity) {
        this.app = app;
        this.entity = new pc.Entity("Map");
        this.playerEntity = playerEntity;

        this.entity.addComponent("model", {
            type: "plane",
        });
        this.entity.setLocalScale(400, 1, 400);

        this.entity.addComponent("collision", {
            type: "box",
            halfExtents: new pc.Vec3(400, 0.1, 400),
            group: Enemy.COLLISION_GROUND,
            mask: Enemy.COLLISION_ENEMY | Enemy.COLLISION_PLAYER,
        });

        this.entity.addComponent("rigidbody", {
            type: "static",
            restitution: 0.5,
            friction: 0.6,
            enable: true
        });
        
        this.app.assets.loadFromUrl(mapTextureUrl, "texture", (err, asset) => {
            if (err) {
                console.error("Error loading texture:", err);
                return;
            }

            if (asset && asset.resource) {
                asset.resource.addressU = pc.ADDRESS_REPEAT;
                asset.resource.addressV = pc.ADDRESS_REPEAT;
            }
    
            // Create a new material
            this.mapMaterial.diffuseMap = asset?.resource;
            this.mapMaterial.diffuseMapTiling = new pc.Vec2(50, 50);
            this.mapMaterial.update();
    
            // Apply the material to the plane
            if (this.entity.model) {
                this.entity.model.meshInstances[0].material = this.mapMaterial;
                // this.entity.model.meshInstances[0].material = matPlane;
            } else {
                console.error("Model not found");
            }
        });

        this.app.root.addChild(this.entity);

        this.checkPlayerlimit();
    }

    checkPlayerlimit() {
        this.app.on("update", () => {
            const playerPos = this.playerEntity.getPosition();
            if (playerPos.x < -50) this.playerEntity.setPosition(-50, playerPos.y, playerPos.z);
            if (playerPos.x > 50) this.playerEntity.setPosition(50, playerPos.y, playerPos.z);
            if (playerPos.z < -50) this.playerEntity.setPosition(playerPos.x, playerPos.y, -50);
            if (playerPos.z > 50) this.playerEntity.setPosition(playerPos.x, playerPos.y, 50);
        });
    }
}