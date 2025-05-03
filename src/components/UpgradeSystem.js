import * as pc from 'playcanvas';
import { setPaused } from './GameState';
import { MagicStaff } from './WeaponMagicStaff.js';
import { MagicBox } from './WeaponMagicBox.js';

export class UpgradeSystem {
    constructor(app, player, uiManager, enemies) {
        this.app = app;
        this.player = player;
        this.uiManager = uiManager;
        this.activeWeapons = [];

        this.magicStaff = new MagicStaff(app, player.entity, enemies);
        this.activeWeapons.push(this.magicStaff);

        this.accumulatedFireRateBoost = 0;
        this.accumulatedDamageBoost = 0;

        this.upgradePool = [
            { title: '🔥 +15% Damage',          type: 'damage',         value: 0.15,    description: 'Increases damage of all weapons by 15%' },
            { title: '💓 +25 Max HP',           type: 'maxHealth',      value: 25,      description: 'Increases max HP by 25 points' },
            { title: '⚡ +20% Speed',           type: 'speed',          value: 0.2,     description: 'Increases movement speed by 20%' },
            { title: '🧲 +1m Pickup Range',     type: 'collectRange',   value: 1,       description: 'Increases pickup range by 1 metre' },
            { title: '🌀 +10% Attack Speed',    type: 'fireRateBoost',  value: 0.1,     description: 'Increases attack speed of all weapons by 10%' },
            { title: '🔫 Magic Staff Upgrade',  type: 'magicStaff',     value: 1,       description: '+1 projectile' },
            { title: '📦 Magic Box Upgrade',    type: 'magicBox',       value: 1,       description: '+1 projectile' },
        ];
    }

    getRandomUpgrades(count = 3) {
        const available = this.upgradePool.filter(up => {
            if (up.type === 'magicStaff') {
                return this.magicStaff?.projectileCount < this.magicStaff?.maxProjectiles;
            }
            if (up.type === 'magicBox') {
                return !this.magicBox || this.magicBox.projectileCount < 6;
            }
            return true;
        });

        const selected = [];
        while (selected.length < count && available.length > 0) {
            const i = Math.floor(Math.random() * available.length);
            selected.push(...available.splice(i, 1));
        }

        return selected;
    }

    async applyUpgrade(up) {
        const { type, value } = up;

        switch (type) {
            case 'damage':
                this.magicStaff && (this.magicStaff.damage *= 1 + value);
                this.magicBox
                    ? (this.magicBox.damage *= 1 + value)
                    : this.accumulatedDamageBoost++;
                break;

            case 'maxHealth':
                this.player.maxHealth += value;
                this.player.health = this.player.maxHealth;
                break;

            case 'speed':
                this.player.speed *= 1 + value;
                break;

            case 'collectRange':
                this.player.collectRange += value;
                break;

            case 'fireRateBoost':
                if (this.magicStaff) {
                    this.magicStaff.fireRate = Math.max(0.1, this.magicStaff.fireRate - value);
                }
                this.magicBox
                    ? (this.magicBox.rotationSpeed *= 1 + value)
                    : this.accumulatedFireRateBoost++;
                break;

            case 'magicStaff':
                this._upgradeMagicStaff();
                break;

            case 'magicBox':
                this._upgradeMagicBox();
                break;
        }

        setPaused(false);
    }

    _upgradeMagicStaff() {
        const ms = this.magicStaff;
        if (ms.projectileCount < ms.maxProjectiles) {
            ms.weaponLevel++;
            ms.projectileCount++;
            console.log(`⚕️ MagicStaff upgraded: ${ms.projectileCount} projectiles, ${ms.damage.toFixed(1)} dmg`);
        }
    }

    _upgradeMagicBox() {
        if (!this.magicBox) {
            this.magicBox = new MagicBox(this.app, this.player.getEntity(), this.player.enemies, 5, 1);
            this.activeWeapons.push(this.magicBox);
            console.log('🔓 Magic Box unlocked!');

            if (this.accumulatedFireRateBoost > 0) {
                const boost = Math.pow(1.1, this.accumulatedFireRateBoost);
                this.magicBox.rotationSpeed *= boost;
            }

            if (this.accumulatedDamageBoost > 0) {
                const boost = Math.pow(1.1, this.accumulatedDamageBoost);
                this.magicBox.damage *= boost;
            }
        } else {
            const box = this.magicBox;
            if (box.projectileCount < 6) {
                box.projectileCount++;
                box.initProjectiles();
            }
            box.damage *= 1.1;
            box.rotationSpeed *= 1.1;
            console.log(`📦 MagicBox upgraded: ${box.projectileCount} projectiles, ${box.damage.toFixed(1)} dmg`);
        }
    }

    async handleLevelUp() {
        setPaused(true);
        const upgrades = this.getRandomUpgrades();
        this.uiManager.showUpgradePanel(upgrades, async chosen => {
            await this.applyUpgrade(chosen);
        });
    }
}