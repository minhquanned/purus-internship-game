import * as pc from 'playcanvas';

export class WeaponBase {
    timeToAttack = 1;
    timer = 0;
    isAttacking = false;

    constructor() {
        this.timer = this.timeToAttack;
    }

    update(dt) {
        this.timer -= dt;

        if (this.timer <= 0) {
            this.attack();
            this.timer = this.timeToAttack;
        }
    }

    startAttacking() {
        this.isAttacking = true;
    }

    stopAttacking() {
        this.isAttacking = false;
    }

    attack() {
        
    }
}