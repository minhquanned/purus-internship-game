export class UIManager {
    constructor() {
        this.gameTimer = {
            startTime: 0,
            hours: 0,
            minutes: 0,
            seconds: 0
        };
        this.isPaused = false;
        this.isGuided = false;
    }

    initialize(isPausedFn, isGuidedFn) {
        // Store the functions to check game state
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
        
        const currentTime = Date.now();
        const elapsedTime = Math.floor((currentTime - this.gameTimer.startTime) / 1000);
        
        this.gameTimer.hours = Math.floor(elapsedTime / 3600);
        this.gameTimer.minutes = Math.floor((elapsedTime % 3600) / 60);
        this.gameTimer.seconds = elapsedTime % 60;
        
        // Update timer display
        document.getElementById('hours').textContent = String(this.gameTimer.hours).padStart(2, '0');
        document.getElementById('minutes').textContent = String(this.gameTimer.minutes).padStart(2, '0');
        document.getElementById('seconds').textContent = String(this.gameTimer.seconds).padStart(2, '0');
    }

    updateHPBar(currentHP, maxHP) {
        const hpFill = document.getElementById('hp-fill');
        const hpText = document.getElementById('hp-text');
        
        if (!hpFill || !hpText) return;
        
        const percentage = (currentHP / maxHP) * 100;
        hpFill.style.width = `${percentage}%`;
        hpText.textContent = `${currentHP}/${maxHP}`;
        
        // Update color based on HP percentage
        if (percentage <= 25) {
            hpFill.style.background = 'linear-gradient(90deg, #ff0000, #ff4400)';
        } else if (percentage <= 50) {
            hpFill.style.background = 'linear-gradient(90deg, #ff4400, #ff6b00)';
        } else {
            hpFill.style.background = 'linear-gradient(90deg, #ff4400, #ff6b00)';
        }
    }

    // Reset timer if needed
    resetTimer() {
        this.gameTimer.startTime = Date.now();
        this.gameTimer.hours = 0;
        this.gameTimer.minutes = 0;
        this.gameTimer.seconds = 0;
        this.updateTimer();
    }

    // Get elapsed time in seconds if needed
    getElapsedTime() {
        return Math.floor((Date.now() - this.gameTimer.startTime) / 1000);
    }
}