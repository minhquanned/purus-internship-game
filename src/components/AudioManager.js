import bgmUrl from '../../assets/sounds/You-have-no-enemies.mp3'
import attackSFXUrl from '../../assets/sounds/Magic-staff-shoot.wav'
import hitSFXUrl from '../../assets/sounds/Hurt.mp3'

const AUDIO_DEFS = {
    bgm: { url: bgmUrl, loop: true },
    attack: { url: attackSFXUrl },
    hit: { url: hitSFXUrl }
};

export const createAudioAssets = (app) =>
    Object.fromEntries(
        Object.entries(AUDIO_DEFS).map(([key, { url }]) => [
            key,
            new pc.Asset(`${key}-sound`, 'audio', { url })
        ])
    );

export class AudioManager {
    bgmVolume = 0.5;
    sfxVolume = 1.0;
    sounds = {};

    async initialize(app) {
        this.app = app;
        this.audioAssets = createAudioAssets(app);

        this.soundEntity = new pc.Entity('sound');
        this.soundEntity.addComponent('sound');
        this.app.root.addChild(this.soundEntity);

        Object.values(this.audioAssets).forEach(asset => this.app.assets.add(asset));

        await Promise.all(
            Object.entries(this.audioAssets).map(([key, asset]) =>
                new Promise((resolve) => {
                    asset.once('load', () => {
                        this.soundEntity.sound.addSlot(key, {
                            name: key,
                            asset,
                            volume: key === 'bgm' ? this.bgmVolume : this.sfxVolume,
                            loop: AUDIO_DEFS[key].loop || false
                        });
                        this.sounds[key] = this.soundEntity.sound.slots[key];
                        resolve();
                    });
                    this.app.assets.load(asset);
                })
            )
        );
    }

    playBGM() {
        this._play('bgm');
    }

    playSFX(name) {
        this._play(name);
    }

    _play(name) {
        this.soundEntity?.sound?.play(name);
    }

    setBGMVolume(vol) {
        this.bgmVolume = pc.math.clamp(vol, 0, 1);
        this.sounds.bgm && (this.sounds.bgm.volume = this.bgmVolume);
    }

    setSFXVolume(vol) {
        this.sfxVolume = pc.math.clamp(vol, 0, 1);
        for (const [key, slot] of Object.entries(this.sounds)) {
            if (key !== 'bgm') slot.volume = this.sfxVolume;
        }
    }
}