import * as pc from 'playcanvas';
import { Player } from '../../components/Player.ts';
import { Enemy } from '../../components/Enemy.ts';

window.onload = () => {
    const canvas = document.createElement("canvas");
    document.body.appendChild(canvas);

    const app = new pc.Application(canvas);
    app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
    app.setCanvasResolution(pc.RESOLUTION_AUTO);

    window.addEventListener('resize', () => app.resizeCanvas());

    app.start();

    // Set up camera
    const cameraEntity = new pc.Entity("MainCamera");
    app.root.addChild(cameraEntity);
    cameraEntity.addComponent("camera", {
        clearColor: new pc.Color(0.1, 0.1, 0.1)
    });
    const cameraOffset = new pc.Vec3(0, 1.5, -3);
    cameraEntity.setPosition(cameraOffset);
    cameraEntity.setEulerAngles(-20, 180, 0);

    // Set up light
    const light = new pc.Entity("DirectionalLight");
    app.root.addChild(light);
    light.addComponent("light", {
        type: pc.LIGHTTYPE_DIRECTIONAL,
        color: new pc.Color(1, 1, 1),
        intensity: 1
    });
    light.setEulerAngles(-90, 10, 90);

    // Create a plane
    const planeEntity = new pc.Entity("Plane");
    planeEntity.addComponent("model", {
        type: "plane"
    });
    planeEntity.setLocalScale(10, 1, 10);
    const matPlane = new pc.StandardMaterial();
    matPlane.emissive = new pc.Color(31 / 255, 43 / 255, 45 / 255);
    planeEntity.model!.meshInstances[0].material = matPlane;
    app.root.addChild(planeEntity);

    const player = new Player(
        app, 
        "../../../assets/models/Knight.glb", 
        "../../../assets/textures/knight_texture.png", 
        0.4
    );

    const enemy = new Enemy(
        app,
        "../../../assets/models/Skeleton_Minion.glb",
        "../../../assets/textures/skeleton_texture.png",
        0.4,
        player.entity
    );

    app.on("update", (dt) => {
        enemy.update(dt);
    });
};