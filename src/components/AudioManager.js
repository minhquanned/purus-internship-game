import * as pc from 'playcanvas';

export class AudioManager {
    static instance = null;
    
    constructor(app) {
        if (AudioManager.instance) {
            return AudioManager.instance;
        }
        
        this.app = app;
        this.initialized = false;
        this.slots = new Map();
        this.sounds = new Map();
        this.currentBGM = null;
        
        // Định nghĩa các slot audio
        this.slots.set('BGM', {
            volume: 0.5,
            loop: true,
            overlap: false
        });
        
        this.slots.set('SFX', {
            volume: 0.8,
            loop: false,
            overlap: true
        });
        
        AudioManager.instance = this;
    }

    static getInstance(app) {
        if (!AudioManager.instance) {
            AudioManager.instance = new AudioManager(app);
        }
        return AudioManager.instance;
    }

    async initialize() {
        try {
            // Kiểm tra sound system
            if (!this.app.systems.sound) {
                throw new Error('Sound system not initialized');
            }

            // Định nghĩa các âm thanh
            const soundDefinitions = {
                'BGM': {
                    GAME: {
                        url: 'sounds/You-have-no-enemies.mp3',
                        slot: 'BGM'
                    },
                    // MENU: {
                    //     url: 'audio/bgm/menu_bgm.mp3',
                    //     slot: 'BGM'
                    // }
                },
                'SFX': {
                    PLAYER_ATTACK: {
                        url: 'sounds/Magic-staff-shoot.wav',
                        slot: 'SFX'
                    },
                    // PLAYER_HIT: {
                    //     url: 'audio/sfx/player_hit.mp3',
                    //     slot: 'SFX'
                    // },
                    // ENEMY_DIE: {
                    //     url: 'audio/sfx/enemy_die.mp3',
                    //     slot: 'SFX'
                    // }
                }
            };

            // Load tất cả âm thanh
            for (const category in soundDefinitions) {
                for (const soundKey in soundDefinitions[category]) {
                    const soundDef = soundDefinitions[category][soundKey];
                    await this.loadSound(soundKey, soundDef.url, soundDef.slot);
                }
            }

            this.initialized = true;
            console.log('Audio Manager initialized successfully');
        } catch (error) {
            console.error('Failed to initialize AudioManager:', error);
            throw error;
        }
    }

    async loadSound(key, url, slotName) {
        try {
            const asset = new pc.Asset(key, 'audio', {
                url: url
            });

            return new Promise((resolve, reject) => {
                this.app.assets.add(asset);

                asset.once('load', () => {
                    const slot = this.slots.get(slotName);
                    if (!slot) {
                        reject(new Error(`Invalid slot name: ${slotName}`));
                        return;
                    }

                    const sound = new pc.Sound(this.app, {
                        volume: slot.volume,
                        loop: slot.loop,
                        singleInstance: !slot.overlap
                    });

                    sound.asset = asset;
                    this.sounds.set(key, sound);
                    resolve(sound);
                });

                asset.once('error', (err) => {
                    reject(new Error(`Failed to load sound ${key}: ${err}`));
                });

                this.app.assets.load(asset);
            });
        } catch (error) {
            console.error(`Error loading sound ${key}:`, error);
            throw error;
        }
    }

    isReady() {
        return this.initialized;
    }

    playSound(key) {
        try {
            const sound = this.sounds.get(key);
            if (!sound) {
                console.warn(`Sound not found: ${key}`);
                return;
            }

            sound.play();
        } catch (error) {
            console.error(`Error playing sound ${key}:`, error);
        }
    }

    stopSound(key) {
        try {
            const sound = this.sounds.get(key);
            if (!sound) {
                console.warn(`Sound not found: ${key}`);
                return;
            }

            sound.stop();
        } catch (error) {
            console.error(`Error stopping sound ${key}:`, error);
        }
    }

    playBGM(key) {
        try {
            // Dừng BGM hiện tại nếu có
            if (this.currentBGM) {
                this.stopSound(this.currentBGM);
            }

            const sound = this.sounds.get(key);
            if (!sound) {
                console.warn(`BGM not found: ${key}`);
                return;
            }

            sound.play();
            this.currentBGM = key;
        } catch (error) {
            console.error(`Error playing BGM ${key}:`, error);
        }
    }

    stopBGM() {
        if (this.currentBGM) {
            this.stopSound(this.currentBGM);
            this.currentBGM = null;
        }
    }

    setVolume(slot, volume) {
        const slotConfig = this.slots.get(slot);
        if (!slotConfig) {
            console.warn(`Slot not found: ${slot}`);
            return;
        }

        slotConfig.volume = Math.max(0, Math.min(1, volume));
        
        // Cập nhật volume cho tất cả các sound trong slot
        this.sounds.forEach((sound, key) => {
            if (this.getSoundSlot(key) === slot) {
                sound.volume = slotConfig.volume;
            }
        });
    }

    getSoundSlot(key) {
        // Kiểm tra sound thuộc slot nào
        for (const [category, sounds] of Object.entries(soundDefinitions)) {
            if (sounds[key]) {
                return sounds[key].slot;
            }
        }
        return null;
    }

    pauseAll() {
        this.sounds.forEach(sound => {
            if (sound.isPlaying) {
                sound.pause();
            }
        });
    }

    resumeAll() {
        this.sounds.forEach(sound => {
            if (sound.isPaused) {
                sound.resume();
            }
        });
    }
}