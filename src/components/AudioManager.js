import * as pc from 'playcanvas';

export const createAudioAssets = (app) => ({
    bgm: new pc.Asset('background-music', 'audio', {
        url: 'sounds/You-have-no-enemies.mp3'
    }),
    attack: new pc.Asset('attack-sound', 'audio', {
        url: 'sounds/Magic-staff-shoot.wav' 
    }),
    hit: new pc.Asset('hit-sound', 'audio', {
        url: 'sounds/Hurt.mp3'
    }),
});

export class AudioManager {
    constructor() {
        this.app = null;
        this.sounds = {};
        this.bgmVolume = 0.5;
        this.sfxVolume = 1.0;
        this.audioAssets = null;
        this.soundEntity = null;
    }

    async initialize(app) {
        this.app = app;
        this.audioAssets = createAudioAssets(app);

        // Create a sound entity
        this.soundEntity = new pc.Entity('sound');
        this.soundEntity.addComponent('sound');
        this.app.root.addChild(this.soundEntity);

        // Add assets to app
        Object.values(this.audioAssets).forEach(asset => {
            this.app.assets.add(asset);
        });

        // Wait for all audio assets to load
        return new Promise((resolve) => {
            let loadedCount = 0;
            const totalAssets = Object.keys(this.audioAssets).length;

            Object.entries(this.audioAssets).forEach(([key, asset]) => {
                asset.on('load', () => {
                    // Add sound slot to the sound component
                    const slot = {
                        name: key,
                        asset: asset,
                        volume: key === 'bgm' ? this.bgmVolume : this.sfxVolume,
                        loop: key === 'bgm'
                    };

                    this.soundEntity.sound.addSlot(key, slot);
                    this.sounds[key] = slot;
                    
                    loadedCount++;
                    if (loadedCount === totalAssets) {
                        resolve();
                    }
                });

                // Start loading
                this.app.assets.load(asset);
            });
        });
    }

    playBGM() {
        if (this.soundEntity && this.soundEntity.sound && this.sounds.bgm) {
            this.soundEntity.sound.play('bgm');
        }
    }

    playSFX(soundName) {
        if (this.soundEntity && this.soundEntity.sound && this.sounds[soundName]) {
            this.soundEntity.sound.play(soundName);
        }
    }

    setBGMVolume(volume) {
        this.bgmVolume = Math.max(0, Math.min(1, volume));
        if (this.soundEntity && this.soundEntity.sound && this.sounds.bgm) {
            this.soundEntity.sound.slots.bgm.volume = this.bgmVolume;
        }
    }

    setSFXVolume(volume) {
        this.sfxVolume = Math.max(0, Math.min(1, volume));
        Object.keys(this.sounds).forEach(key => {
            if (key !== 'bgm' && this.soundEntity && this.soundEntity.sound) {
                this.soundEntity.sound.slots[key].volume = this.sfxVolume;
            }
        });
    }
}