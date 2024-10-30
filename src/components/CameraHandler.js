import * as pc from 'playcanvas';
import { AmmoDebugDrawer } from './ammoDebugDrawer';

export class CameraHandler {
    app;
    entity;
    targetEntity;
    cameraOffset;
    followSpeed;
    targetPos;
    smoothing = 10;
    debugDrawer;
    newPosition = new pc.Vec3();

    constructor(
        app, 
        targetEntity, 
        cameraOffset = new pc.Vec3(0, 10, 10),
        followSpeed = 5
    ) {
        this.app = app;
        this.targetEntity = targetEntity;
        this.cameraOffset = cameraOffset;
        this.followSpeed = followSpeed;
        this.targetPos = new pc.Vec3();

        // Create and set up camera entity
        this.entity = new pc.Entity("MainCamera");
        this.entity.addComponent("camera", {
            clearColor: new pc.Color(0.1, 0.1, 0.1),
            farClip: 1000
        });

        // Initialize debug drawer safely
        try {
            if (window.Ammo) {
                this.debugDrawer = new AmmoDebugDrawer(this.app, {
                    limit: {
                        entity: this.entity,
                        distance: 50
                    }
                });
                
                if (this.debugDrawer) {
                    this.debugDrawer.enabled = false;
                }
            }
        } catch (error) {
            console.warn('Debug drawer initialization failed:', error);
        }

        this.app.root.addChild(this.entity);
        
        this.updateCameraPosition(1);
    }

    update(dt = 1/60) {
        if (!this.targetEntity || !this.entity) return;

        this.updateCameraPosition(dt);
        
        if (this.debugDrawer && this.debugDrawer.update) {
            this.debugDrawer.update();
        }
    }

    updateCameraPosition(dt) {
        this.targetPos.copy(this.targetEntity.getPosition());

        // Calculate desired camera position
        const desiredPosition = new pc.Vec3(
            this.targetPos.x + this.cameraOffset.x,
            this.targetPos.y + this.cameraOffset.y,
            this.targetPos.z + this.cameraOffset.z
        );

        const currentPosition = this.entity.getPosition();

        this.newPosition.lerp(
            currentPosition,
            desiredPosition,
            this.smoothing * this.followSpeed * dt
        );

        // Look at target
        this.entity.setPosition(this.newPosition);
        this.entity.lookAt(this.targetPos);
    }

    setCameraOffset(offset) {
        this.cameraOffset.copy(offset);
    }

    setFollowSpeed(speed) {
        this.followSpeed = speed;
    }

    setSmoothingFactor(smoothing) {
        this.smoothing = Math.max(0, Math.min(1, smoothing));
    }

    getEntity() {
        return this.entity;
    }

    destroy() {
        if (this.debugDrawer && this.debugDrawer.destroy) {
            this.debugDrawer.destroy();
        }
        
        if (this.entity) {
            this.entity.destroy();
        }
    }
}