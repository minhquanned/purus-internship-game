import * as pc from 'playcanvas';

export class MapDecorations {
    constructor(app, map) {
        this.app = app;
        this.map = map;
        this.decorations = [];
        
        // Define decoration types with their properties
        this.decorationTypes = [
            {
                model: 'models/tree_single_A.fbx',
                texture: 'textures/hexagons_medieval.png',
                minScale: 0.5,
                maxScale: 1.5,
                count: 15,
                collision: true,
                collisionRadius: 1
            },
            {
                model: 'models/tree_single_B.fbx',
                texture: 'textures/hexagons_medieval.png',
                minScale: 1,
                maxScale: 2,
                count: 10,
                collision: true,
                collisionRadius: 0.8
            },
            {
                model: 'models/rock_single_A.fbx',
                texture: 'textures/hexagons_medieval.png',
                minScale: 0.3,
                maxScale: 0.8,
                count: 20,
                collision: false
            },
            {
                model: 'models/rock_single_B.fbx',
                texture: 'textures/hexagons_medieval.png',
                minScale: 0.2,
                maxScale: 0.4,
                count: 12,
                collision: false
            },
            {
                model: 'models/waterplant_A.fbx',
                texture: 'textures/hexagons_medieval.png',
                minScale: 0.2,
                maxScale: 0.4,
                count: 12,
                collision: false
            }
        ];

        this.initialize();
    }

    initialize() {
        this.decorationTypes.forEach(decorationType => {
            // this.loadAndPlaceDecorations(decorationType);
            for (let i = 0; i < decoration.count; i++) {
                this.loadDecoration(decoration);
            }
        });
    }

    loadDecoration(decoration) {
        // Load model
        this.app.assets.loadFromUrl(decoration.model, 'model', (err, asset) => {
            if (err) {
                console.error(`Error loading model ${decoration.model}:`, err);
                return;
            }
            
            const entity = new pc.Entity();
            entity.addComponent('model', {
                type: 'asset',
                asset: asset,
            });

            // Apply texture if provided
            if (decoration.texture) {
                this.app.assets.loadFromUrl(decoration.texture, 'texture', (err, textureAsset) => {
                    if (err) {
                        console.error(`Error loading texture ${decoration.texture}:`, err);
                        return;
                    }
                    const material = new pc.StandardMaterial();
                    material.diffuseMap = textureAsset.resource;
                    material.update();

                    entity.model.meshInstances.forEach(meshInstance => {
                        meshInstance.material = material;
                    });
                });
            }

            // Set random scale
            const scale = pc.math.lerp(decoration.minScale, decoration.maxScale, Math.random());
            entity.setLocalScale(scale, scale, scale);

            // Set random position (Example within a specific area)
            entity.setPosition(
                pc.math.random(-100, 100),
                0,
                pc.math.random(-100, 100)
            );

            // Optionally, add collision
            if (decoration.collision) {
                entity.addComponent('collision', {
                    type: 'sphere',
                    radius: decoration.collisionRadius,
                });
                entity.addComponent('rigidbody', {
                    type: 'static',
                });
            }

            this.map.entity.addChild(entity);
            this.decorations.push(entity);
        });
    }

    loadAndPlaceDecorations(decorationType) {
        this.app.assets.loadFromUrl(decorationType.model, 'container', (err, asset) => {
            if (err) {
                console.error('Error loading decoration:', err);
                return;
            }

            for (let i = 0; i < decorationType.count; i++) {
                this.placeDecoration(asset, decorationType);
            }
        });
    }

    placeDecoration(asset, decorationType) {
        // Create entity for the decoration
        const decoration = new pc.Entity();
        
        // Random position within map bounds (-45 to 45 to keep some margin from edges)
        const x = Math.random() * 90 - 45;
        const z = Math.random() * 90 - 45;
        
        // Random rotation
        const rotation = Math.random() * 360;
        
        // Random scale within defined range
        const scale = Math.random() * (decorationType.maxScale - decorationType.minScale) + decorationType.minScale;
        
        // Set transform
        decoration.setPosition(x, 0, z);
        decoration.setEulerAngles(0, rotation, 0);
        decoration.setLocalScale(scale, scale, scale);

        // Add model component
        decoration.addComponent('model', {
            type: 'asset',
            asset: asset
        });

        // Add collision if specified
        if (decorationType.collision) {
            decoration.addComponent('collision', {
                type: 'cylinder',
                radius: decorationType.collisionRadius * scale,
                height: 2 * scale
            });

            decoration.addComponent('rigidbody', {
                type: 'static',
                restitution: 0.5
            });
        }

        // Add to scene
        this.app.root.addChild(decoration);
        this.decorations.push(decoration);
    }

    // Method to remove all decorations
    clear() {
        this.decorations.forEach(decoration => {
            decoration.destroy();
        });
        this.decorations = [];
    }
}