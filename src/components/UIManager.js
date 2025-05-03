export class UIManager {
    constructor() {
        this.gameTimer = {
            startTime: 0,
            hours: 0,
            minutes: 0,
            seconds: 0,
        };
        this.isPaused = false;
        this.isGuided = false;
    }

    initialize(isPausedFn, isGuidedFn) {
        this.isPaused = isPausedFn;
        this.isGuided = isGuidedFn;
        this.initializeTimer();
    }

    initializeTimer() {
        this.gameTimer.startTime = Date.now();
        this.updateTimer();
    }

    updateTimer() {
        if (this.isPaused() || this.isGuided()) return;

        const elapsed = Math.floor((Date.now() - this.gameTimer.startTime) / 1000);
        const { hours, minutes, seconds } = this.secondsToTime(elapsed);
        Object.assign(this.gameTimer, { hours, minutes, seconds });

        this.updateElementText('hours', hours);
        this.updateElementText('minutes', minutes);
        this.updateElementText('seconds', seconds);
    }

    updateElementText(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = String(value).padStart(2, '0');
    }

    secondsToTime(totalSeconds) {
        return {
            hours: Math.floor(totalSeconds / 3600),
            minutes: Math.floor((totalSeconds % 3600) / 60),
            seconds: totalSeconds % 60,
        };
    }

    updateHPBar(currentHP, maxHP) {
        const hpFill = document.getElementById('hp-fill');
        const hpText = document.getElementById('hp-text');
        if (!hpFill || !hpText) return;

        const percent = (currentHP / maxHP) * 100;
        hpFill.style.width = `${percent}%`;
        hpText.textContent = `${currentHP}/${maxHP}`;
        hpFill.style.background = this.getHPColor(percent);
    }

    getHPColor(percent) {
        if (percent <= 25) return 'linear-gradient(90deg, #ff0000, #ff4400)';
        return 'linear-gradient(90deg, #ff4400, #ff6b00)';
    }

    updateXPBar(currentXP, xpToLevelUp, level) {
        const xpFill = document.getElementById('xp-fill');
        const xpText = document.getElementById('xp-text');
        if (!xpFill || !xpText) return;

        const percent = (currentXP / xpToLevelUp) * 100;
        const formatted = percent.toFixed(1);
        xpFill.style.width = `${formatted}%`;
        xpText.textContent = `${formatted}% - Level ${level}`;
    }

    showUpgradePanel(upgrades, applyCallback) {
        const panel = document.getElementById('upgrade-panel');
        const container = document.getElementById('upgrade-cards');
        if (!panel || !container) return;

        panel.classList.remove('hide');
        container.innerHTML = '';

        upgrades.forEach(upgrade => {
            const card = document.createElement('div');
            card.className = 'upgrade-card';
            card.innerHTML = `<strong>${upgrade.title}</strong><br>${upgrade.description}`;
            card.onclick = () => {
                panel.classList.add('hide');
                applyCallback(upgrade);
            };
            container.appendChild(card);
        });
    }

    resetTimer() {
        this.gameTimer.startTime = Date.now();
        Object.assign(this.gameTimer, { hours: 0, minutes: 0, seconds: 0 });
        this.updateTimer();
    }

    getElapsedTime() {
        return Math.floor((Date.now() - this.gameTimer.startTime) / 1000);
    }
}