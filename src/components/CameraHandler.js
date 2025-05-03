import { AmmoDebugDrawer } from './ammoDebugDrawer.js';

export class CameraHandler {
    smoothing = 10;
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

        this._createCamera();
        this._initDebugDrawer();
        this.app.root.addChild(this.entity);

        this.updateCameraPosition(1); // Initial position
    }

    _createCamera() {
        this.entity = new pc.Entity("MainCamera");
        this.entity.addComponent("camera", {
            clearColor: new pc.Color(0.1, 0.1, 0.1),
            farClip: 1000
        });
    }

    _initDebugDrawer() {
        try {
            if (window.Ammo) {
                this.debugDrawer = new AmmoDebugDrawer(this.app, {
                    limit: {
                        entity: this.entity,
                        distance: 50
                    }
                });
                this.debugDrawer.enabled = false;
            }
        } catch (err) {
            console.warn('Debug drawer init failed:', err);
        }
    }

    update(dt = 1 / 60) {
        if (!this.targetEntity || !this.entity) return;
        this.updateCameraPosition(dt);
        this.debugDrawer?.update?.();
    }

    updateCameraPosition(dt) {
        this.targetPos.copy(this.targetEntity.getPosition());

        const desired = this.targetPos.clone().add(this.cameraOffset);
        const current = this.entity.getPosition();
        const t = Math.min(1, this.smoothing * this.followSpeed * dt);

        this.newPosition.lerp(current, desired, t);
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
        this.smoothing = pc.math.clamp(smoothing, 0, 1);
    }

    getEntity() {
        return this.entity;
    }

    destroy() {
        this.debugDrawer?.destroy?.();
        this.entity?.destroy?.();
    }
}