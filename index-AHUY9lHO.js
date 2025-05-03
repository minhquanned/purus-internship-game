var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
(function polyfill() {
  const relList = document.createElement("link").relList;
  if (relList && relList.supports && relList.supports("modulepreload")) {
    return;
  }
  for (const link of document.querySelectorAll('link[rel="modulepreload"]')) {
    processPreload(link);
  }
  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== "childList") {
        continue;
      }
      for (const node of mutation.addedNodes) {
        if (node.tagName === "LINK" && node.rel === "modulepreload")
          processPreload(node);
      }
    }
  }).observe(document, { childList: true, subtree: true });
  function getFetchOpts(link) {
    const fetchOpts = {};
    if (link.integrity) fetchOpts.integrity = link.integrity;
    if (link.referrerPolicy) fetchOpts.referrerPolicy = link.referrerPolicy;
    if (link.crossOrigin === "use-credentials")
      fetchOpts.credentials = "include";
    else if (link.crossOrigin === "anonymous") fetchOpts.credentials = "omit";
    else fetchOpts.credentials = "same-origin";
    return fetchOpts;
  }
  function processPreload(link) {
    if (link.ep)
      return;
    link.ep = true;
    const fetchOpts = getFetchOpts(link);
    fetch(link.href, fetchOpts);
  }
})();
let isPaused = true;
function setPaused(value) {
  isPaused = value;
}
let isGuided = true;
function setGuided(value) {
  isGuided = value;
}
const COLLISION_GROUPS = {
  NONE: 0,
  GROUND: 1,
  ENEMY: 2,
  PLAYER: 4,
  COLLECTIBLE: 8,
  PROJECTILE: 16
};
class Player {
  constructor(app, modelUrl, textureUrl, scale, enemies) {
    __publicField(this, "animations", {});
    __publicField(this, "currentAnim", "Idle");
    __publicField(this, "movement", new pc.Vec3());
    __publicField(this, "speed", 2);
    __publicField(this, "health", 100);
    __publicField(this, "maxHealth", 100);
    __publicField(this, "collectRange", 1.5);
    __publicField(this, "xp", 0);
    __publicField(this, "level", 1);
    __publicField(this, "xpToLevelUp", 50);
    __publicField(this, "attacking", false);
    __publicField(this, "isAlive", true);
    __publicField(this, "eventHandlers", {});
    this.app = app;
    this.enemies = enemies;
    this.lastDirection = 0;
    this.entity = new pc.Entity("Player");
    this.entity.tags.add("player");
    this.entity.setPosition(0, 1, 0);
    this._initPhysics();
    this._createPlayerScript();
    this._loadModelAndAnimations(modelUrl, textureUrl, scale);
    app.root.addChild(this.entity);
    this._addKeyboardControls();
  }
  _initPhysics() {
    this.entity.addComponent("collision", {
      type: "box",
      halfExtents: new pc.Vec3(0.2, 0.1, 0.2),
      group: COLLISION_GROUPS.PLAYER,
      mask: COLLISION_GROUPS.COLLECTIBLE | COLLISION_GROUPS.GROUND
    });
    this.entity.addComponent("rigidbody", {
      type: "dynamic",
      mass: 1,
      friction: 0.9,
      linearDamping: 0.9,
      angularDamping: 0.9,
      group: COLLISION_GROUPS.PLAYER,
      mask: COLLISION_GROUPS.ENEMY | COLLISION_GROUPS.PROJECTILE | COLLISION_GROUPS.GROUND
    });
    this.entity.rigidbody.angularFactor = new pc.Vec3(0, 1, 0);
  }
  _createPlayerScript() {
    this.entity.addComponent("script");
    try {
      pc.createScript.get("player");
    } catch {
      const PlayerScript = pc.createScript("player");
      PlayerScript.prototype.swap = function(old) {
        this.playerInstance = old.playerInstance;
      };
      PlayerScript.prototype.initialize = function() {
        this.playerInstance = this.entity.playerInstance;
      };
      PlayerScript.prototype.takeDamage = function(damage) {
        var _a;
        (_a = this.playerInstance) == null ? void 0 : _a.takeDamage(damage);
      };
    }
    this.entity.playerInstance = this;
    this.entity.script.create("player");
  }
  _loadModelAndAnimations(modelUrl, textureUrl, scale) {
    this.app.assets.loadFromUrl(modelUrl, "container", (err, asset) => {
      var _a;
      if (err) {
        console.error("Error loading model: ", err);
        return;
      }
      this.entity.addComponent("model", {
        type: "asset",
        asset: asset == null ? void 0 : asset.resource.model
      });
      this.entity.setLocalScale(scale, scale, scale);
      if (asset == null ? void 0 : asset.resource.animations) {
        this.entity.addComponent("anim", {
          activate: true
        });
        asset.resource.animations.forEach((anim) => {
          var _a2;
          this.animations[anim.resource.name] = anim.resource;
          (_a2 = this.entity.anim) == null ? void 0 : _a2.assignAnimation(anim.resource.name, anim.resource);
        });
        this.currentAnim = "Idle";
        (_a = this.entity.anim) == null ? void 0 : _a.baseLayer.play("Idle");
      }
      this._loadTexture(textureUrl);
    });
  }
  _loadTexture(textureUrl) {
    this.app.assets.loadFromUrl(textureUrl, "texture", (err, asset) => {
      var _a;
      if (err || !asset) return console.error("Error loading texture:", err);
      const material = new pc.StandardMaterial();
      material.diffuseMap = asset.resource;
      material.update();
      (_a = this.entity.model) == null ? void 0 : _a.meshInstances.forEach((m) => m.material = material);
    });
  }
  takeDamage(dmg) {
    if (!this.isAlive) return;
    this.health -= dmg;
    console.log("Player took damage! Health:", this.health);
    if (this.health <= 0) {
      console.log("Player has been defeated!");
      this._die();
    }
  }
  _die() {
    if (this.animations["Lie_Down"]) {
      this.playAnimation("Lie_Down", false);
      this.isAlive = false;
      setTimeout(() => {
        window.gameManager.showGameOver();
        this.entity.destroy();
        setPaused(true);
      }, 2e3);
    } else {
      window.gameManager.showGameOver();
      this.entity.destroy();
      setPaused(true);
    }
  }
  gainXP(amount) {
    this.xp += amount;
    console.log(`💰 Gained ${amount} XP. Total XP: ${this.xp}`);
    while (this.xp >= this.xpToLevelUp) this._levelUp();
    this._updateXPUI();
  }
  _levelUp() {
    this.level++;
    this.xp -= this.xpToLevelUp;
    this.xpToLevelUp = Math.floor(this.xpToLevelUp * 1.2);
    this.health = this.maxHealth;
    console.log(`🎉 Level Up! Now level ${this.level}`);
    this.fire("levelup");
  }
  playAnimation(name, loop = true) {
    var _a;
    if (!this.animations[name] || this.currentAnim === name) return;
    (_a = this.entity.anim) == null ? void 0 : _a.baseLayer.play(name, { loop });
    this.currentAnim = name;
    if (!loop) {
      const anim = this.animations[name];
      const check = () => {
        var _a2;
        const base = (_a2 = this.entity.anim) == null ? void 0 : _a2.baseLayer;
        if (base && base.activeTimeSeconds >= anim.duration) {
          this.playAnimation("Idle");
          this.app.off("update", check);
        }
      };
      this.app.on("update", check);
    }
  }
  _addKeyboardControls() {
    const keyboard = new pc.Keyboard(window);
    window.addEventListener("contextmenu", (e) => e.preventDefault());
    this.app.on("update", (dt) => {
      if (isPaused || !this.isAlive) return;
      const input = new pc.Vec3();
      if (keyboard.isPressed(pc.KEY_W)) input.z -= 1;
      if (keyboard.isPressed(pc.KEY_S)) input.z += 1;
      if (keyboard.isPressed(pc.KEY_A)) input.x -= 1;
      if (keyboard.isPressed(pc.KEY_D)) input.x += 1;
      const isMoving = input.lengthSq() > 0.01;
      if (isMoving) {
        input.normalize().scale(this.speed);
        this.lastDirection = Math.atan2(input.x, input.z) * pc.math.RAD_TO_DEG;
      }
      this.entity.setEulerAngles(0, this.lastDirection, 0);
      const velY = this.entity.rigidbody.linearVelocity.y;
      this.entity.rigidbody.linearVelocity = new pc.Vec3(input.x, velY, input.z);
      if (this.entity.getPosition().y > 0.1) {
        this.entity.rigidbody.applyForce(new pc.Vec3(0, -9.81 * this.entity.rigidbody.mass, 0));
      }
      if (isMoving && this.currentAnim === "Idle") {
        this.playAnimation("Running_B");
      } else if (!isMoving && this.currentAnim === "Running_B") {
        this.playAnimation("Idle");
      }
    });
  }
  // Custom Event System
  on(event, callback) {
    this.eventHandlers[event] = this.eventHandlers[event] || [];
    this.eventHandlers[event].push(callback);
  }
  fire(event, data) {
    var _a;
    (_a = this.eventHandlers[event]) == null ? void 0 : _a.forEach((cb) => cb(data));
  }
  _updateXPUI() {
    document.dispatchEvent(new CustomEvent("player:xpUpdated", {
      detail: {
        xp: this.xp,
        xpToLevelUp: this.xpToLevelUp,
        level: this.level
      }
    }));
  }
  update() {
    if (this.health > this.maxHealth) this.health = this.maxHealth;
  }
  setEnemies(enemies) {
    this.enemies = enemies;
  }
  setAttacking(attacking) {
    this.attacking = attacking;
  }
  getEntity() {
    return this.entity;
  }
  getPosition() {
    return this.entity.getPosition();
  }
  setPosition(x, y, z) {
    this.entity.setPosition(x, y, z);
  }
}
class XPOrb {
  constructor(app, position, xpAmount = 50) {
    this.app = app;
    this.xpAmount = xpAmount;
    this.movingToPlayer = false;
    this.moveSpeed = 10;
    this.checkInterval = 0.2;
    this.timer = 0;
    this.playerEntity = null;
    this.boundUpdate = this.update.bind(this);
    this.entity = this._createEntity(position);
    this._setupCollision();
    this._setupPlayerReference();
    app.root.addChild(this.entity);
    app.on("update", this.boundUpdate);
  }
  _createEntity(position) {
    const entity = new pc.Entity("XPOrb");
    entity.addComponent("model", {
      type: "sphere"
    });
    const material = new pc.StandardMaterial();
    material.emissive = new pc.Color(0, 1, 0.5);
    material.emissiveIntensity = 0.7;
    material.update();
    entity.model.material = material;
    entity.setLocalScale(0.15, 0.15, 0.15);
    entity.setPosition(position.x, 0.2, position.z);
    entity.tags.add("xp-orb");
    return entity;
  }
  _setupCollision() {
    this.entity.addComponent("collision", {
      type: "sphere",
      radius: 0.3,
      trigger: true,
      group: COLLISION_GROUPS.COLLECTIBLE,
      mask: COLLISION_GROUPS.PLAYER
    });
    this.entity.addComponent("rigidbody", {
      type: "kinematic"
    });
    this.entity.collision.on("triggerenter", this._onTriggerEnter, this);
  }
  _setupPlayerReference() {
    const players = this.app.root.findByTag("player");
    if (players.length > 0) {
      this.playerEntity = players[0];
    }
  }
  _onTriggerEnter(otherEntity) {
    var _a;
    if (((_a = otherEntity.tags) == null ? void 0 : _a.has("player")) && otherEntity.playerInstance) {
      otherEntity.playerInstance.gainXP(this.xpAmount);
      this._destroy();
    }
  }
  update(dt) {
    var _a;
    if (!((_a = this.playerEntity) == null ? void 0 : _a.playerInstance)) return;
    if (this.movingToPlayer) {
      this._moveTowardPlayer(dt);
    } else {
      this.timer += dt;
      if (this.timer >= this.checkInterval) {
        this.timer = 0;
        const distance = this.entity.getPosition().distance(this.playerEntity.getPosition());
        const collectRange = this.playerEntity.playerInstance.collectRange || 5;
        if (distance <= collectRange) {
          this.movingToPlayer = true;
        }
      }
    }
  }
  _moveTowardPlayer(dt) {
    const orbPos = this.entity.getPosition();
    const targetPos = this.playerEntity.getPosition().clone().add(pc.Vec3.UP.clone().scale(0.5));
    const direction = new pc.Vec3().sub2(targetPos, orbPos).normalize();
    const distance = targetPos.clone().sub(orbPos).length();
    const moveAmount = Math.min(this.moveSpeed * dt, distance);
    orbPos.add(direction.scale(moveAmount));
    this.entity.setPosition(orbPos);
    this.moveSpeed += dt * 15;
    if (distance < 0.5) {
      this.playerEntity.playerInstance.gainXP(this.xpAmount);
      this._destroy();
    }
  }
  _destroy() {
    this.app.off("update", this.boundUpdate);
    this.entity.destroy();
  }
  getEntity() {
    return this.entity;
  }
}
class Enemy {
  constructor(app, modelUrl, textureUrl, scale, playerEntity, spawnPosition, health = 20, speed = 2, damage = 10) {
    __publicField(this, "animations", {});
    __publicField(this, "currentAnim", "Idle");
    __publicField(this, "app");
    __publicField(this, "entity");
    __publicField(this, "modelEntity");
    __publicField(this, "playerEntity");
    __publicField(this, "movement", new pc.Vec3());
    __publicField(this, "lastFacingDirection", new pc.Vec3());
    __publicField(this, "targetRotation", 0);
    __publicField(this, "isElite", false);
    __publicField(this, "isAlive", true);
    __publicField(this, "attacking", false);
    __publicField(this, "health");
    __publicField(this, "speed");
    __publicField(this, "damage");
    __publicField(this, "attackRange", 0.7);
    __publicField(this, "attackCooldown", 2);
    __publicField(this, "attackTimer", 0);
    this.app = app;
    this.playerEntity = playerEntity;
    this.health = health;
    this.speed = speed;
    this.damage = damage;
    this.entity = this._createEntity(spawnPosition);
    this.modelEntity = this._createModelEntity(scale);
    this.entity.addChild(this.modelEntity);
    this._initCollisionAndPhysics();
    this._initEnemyScript();
    this._loadAssets(modelUrl, textureUrl, scale, spawnPosition);
    app.root.addChild(this.entity);
  }
  _createEntity(spawnPos) {
    const entity = new pc.Entity("Enemy");
    entity.tags.add("enemy");
    if (spawnPos) {
      spawnPos.y = 1;
      entity.setPosition(spawnPos);
    }
    return entity;
  }
  _createModelEntity(scale) {
    const model = new pc.Entity("EnemyModel");
    model.setLocalScale(scale, scale, scale);
    model.setLocalPosition(0, -0.4, 0);
    return model;
  }
  _initCollisionAndPhysics() {
    this.entity.addComponent("collision", {
      type: "box",
      halfExtents: new pc.Vec3(0.2, 0.35, 0.2),
      group: COLLISION_GROUPS.ENEMY,
      mask: COLLISION_GROUPS.GROUND | COLLISION_GROUPS.PROJECTILE
    });
    this.entity.addComponent("rigidbody", {
      type: "dynamic",
      mass: 1,
      friction: 0.9,
      linearDamping: 0.9,
      angularDamping: 1,
      group: COLLISION_GROUPS.ENEMY,
      mask: COLLISION_GROUPS.ENEMY | COLLISION_GROUPS.PROJECTILE | COLLISION_GROUPS.GROUND
    });
  }
  _initEnemyScript() {
    this.entity.addComponent("script");
    try {
      pc.createScript.get("enemy");
    } catch {
      const EnemyScript = pc.createScript("enemy");
      EnemyScript.prototype.swap = function(old) {
        this.enemyInstance = old.enemyInstance;
      };
      EnemyScript.prototype.initialize = function() {
        this.enemyInstance = this.entity.enemyInstance;
      };
      EnemyScript.prototype.takeDamage = function(damage) {
        var _a;
        (_a = this.enemyInstance) == null ? void 0 : _a.takeDamage(damage);
      };
    }
    this.entity.enemyInstance = this;
    this.entity.script.create("enemy");
  }
  _loadAssets(modelUrl, textureUrl, scale, spawnPosition) {
    this.app.assets.loadFromUrl(modelUrl, "container", (err, asset) => {
      var _a;
      if (err) return console.error("Error loading model:", err);
      this.modelEntity.addComponent("model", {
        type: "asset",
        asset: asset.resource.model
      });
      (_a = this.modelEntity.model) == null ? void 0 : _a.meshInstances.forEach((m) => m.castShadow = true);
      const pos = this.entity.getPosition();
      if (pos.y !== 1 || pos.x === 0 && pos.z === 0) {
        console.warn("Enemy position reset, restoring spawn position");
        this.entity.setPosition(spawnPosition);
      }
      if (asset.resource.animations) {
        this.modelEntity.addComponent("anim", { activate: true });
        asset.resource.animations.forEach((anim) => {
          var _a2;
          this.animations[anim.resource.name] = anim.resource;
          (_a2 = this.modelEntity.anim) == null ? void 0 : _a2.assignAnimation(anim.resource.name, anim.resource);
        });
        this.playAnimation("Idle");
      }
      this._loadTexture(textureUrl);
    });
  }
  _loadTexture(textureUrl) {
    this.app.assets.loadFromUrl(textureUrl, "texture", (err, asset) => {
      var _a;
      if (err || !asset) return console.error("Error loading texture:", err);
      const material = new pc.StandardMaterial();
      material.diffuseMap = asset.resource;
      material.update();
      (_a = this.modelEntity.model) == null ? void 0 : _a.meshInstances.forEach((m) => m.material = material);
    });
  }
  markAsElite() {
    var _a;
    this.isElite = true;
    (_a = this.modelEntity.model) == null ? void 0 : _a.meshInstances.forEach((m) => {
      const mat = m.material.clone();
      mat.diffuse.set(
        Math.min(mat.diffuse.r + 0.4, 1),
        mat.diffuse.g * 0.6,
        mat.diffuse.b * 0.6
      );
      mat.update();
      m.material = mat;
    });
  }
  takeDamage(dmg) {
    this.health -= dmg;
    if (this.health <= 0) this._handleDeath();
  }
  _handleDeath() {
    if (!this.isAlive) return;
    this.isAlive = false;
    this.entity.collision && (this.entity.collision.enabled = false);
    this.entity.rigidbody && (this.entity.rigidbody.enabled = false);
    const anim = this.animations["Lie_Down"];
    const rotation = this.entity.getEulerAngles().clone();
    if (anim) {
      this.playAnimation("Lie_Down", false);
      const duration = anim.duration * 1e3 / 2;
      const keepRot = () => {
        var _a;
        return (_a = this.entity) == null ? void 0 : _a.setEulerAngles(0, rotation.y, 0);
      };
      this.app.on("update", keepRot);
      setTimeout(() => {
        this.app.off("update", keepRot);
        this.entity.isReadyForDestruction = true;
      }, duration);
    } else {
      this.entity.isReadyForDestruction = true;
    }
    const pos = this.entity.getPosition().clone();
    const time = window.gameElapsedTime || 0;
    const baseXP = 50;
    const xp = Math.floor(baseXP * (1 + Math.floor(time / 60) * 0.5));
    new XPOrb(this.app, pos, this.isElite ? xp * 5 : xp);
  }
  playAnimation(name, loop = true) {
    var _a;
    const anim = this.animations[name];
    if (!((_a = this.modelEntity) == null ? void 0 : _a.anim) || !anim || this.currentAnim === name) return;
    this.modelEntity.anim.baseLayer.play(name, { loop });
    this.currentAnim = name;
    if (!loop) {
      if (this._animationCompleteCallback)
        this.app.off("update", this._animationCompleteCallback);
      this._animationCompleteCallback = () => {
        var _a2, _b;
        const baseLayer = (_b = (_a2 = this.modelEntity) == null ? void 0 : _a2.anim) == null ? void 0 : _b.baseLayer;
        if (!baseLayer) return;
        const progress = baseLayer.activeTimeSeconds;
        if (progress >= anim.duration) {
          this.playAnimation("Idle", true);
          this.app.off("update", this._animationCompleteCallback);
          this._animationCompleteCallback = null;
        }
      };
      this.app.on("update", this._animationCompleteCallback);
    }
  }
  attackPlayer() {
    if (this.attackTimer < this.attackCooldown || this.attacking) return;
    this.setAttacking(true);
    this._lookAtPlayer();
    this.entity.setEulerAngles(0, this.targetRotation, 0);
    this.playAnimation("2H_Melee_Attack_Slice", false);
    setTimeout(() => {
      var _a;
      if (this.isAlive && ((_a = this.playerEntity.script) == null ? void 0 : _a.player)) {
        this.playerEntity.script.player.takeDamage(this.damage);
      }
      this.playAnimation("Idle");
    }, 1e3);
    setTimeout(() => {
      this.setAttacking(false);
      this.attackTimer = 0;
    }, 1200);
  }
  chasePlayer(dt) {
    if (!this.entity.rigidbody || !this.isAlive) return;
    const playerPos = this.playerEntity.getPosition();
    const enemyPos = this.entity.getPosition();
    const distance = enemyPos.distance(playerPos);
    const direction = new pc.Vec3().sub2(playerPos, enemyPos).normalize();
    direction.y = 0;
    if (distance <= this.attackRange) {
      this.entity.rigidbody.linearVelocity = pc.Vec3.ZERO.clone();
      if (!this.attacking) {
        this._lookAtPlayer(direction);
        this.attackPlayer();
      }
      this.entity.setEulerAngles(0, this.targetRotation, 0);
      if (!this.attacking) this.playAnimation("Idle");
    } else {
      if (!this.attacking) {
        this._lookAtPlayer(direction);
        const vel = this.entity.rigidbody.linearVelocity;
        const targetVel = new pc.Vec3(direction.x * this.speed, vel.y, direction.z * this.speed);
        const force = new pc.Vec3().sub2(targetVel, vel).scale(this.entity.rigidbody.mass * (1 / dt));
        this.entity.rigidbody.applyForce(force);
        this.playAnimation("Running_A");
      }
      this.entity.setEulerAngles(0, this.targetRotation, 0);
    }
    if (enemyPos.y > 0.1)
      this.entity.rigidbody.applyForce(new pc.Vec3(0, -9.81 * this.entity.rigidbody.mass, 0));
    this.entity.rigidbody.angularFactor = pc.Vec3.ZERO.clone();
    const rot = this.entity.getRotation();
    rot.x = 0;
    rot.z = 0;
    this.entity.setRotation(rot);
  }
  _lookAtPlayer(dirOverride = null) {
    const dir = dirOverride || new pc.Vec3().sub2(this.playerEntity.getPosition(), this.entity.getPosition()).normalize();
    this.lastFacingDirection.copy(dir);
    this.targetRotation = Math.atan2(dir.x, dir.z) * pc.math.RAD_TO_DEG;
    return dir;
  }
  setAttacking(state) {
    this.attacking = state;
    if (!state) this._lookAtPlayer();
  }
  update(dt) {
    this.attackTimer += dt;
    this.chasePlayer(dt);
  }
  getEntity() {
    return this.entity;
  }
}
const BASE_PATH$2 = window.location.pathname.includes("purus-internship-game") ? "/purus-internship-game" : "";
class EnemyManager {
  constructor(app, playerEntity) {
    __publicField(this, "enemies", []);
    // Spawn config
    __publicField(this, "enemySpawnTimer", 0);
    __publicField(this, "enemySpawnCooldown", 2);
    __publicField(this, "spawnDistance", 18);
    __publicField(this, "spawnRadius", 19);
    __publicField(this, "minEnemySpacing", 2);
    __publicField(this, "maxSpawnAttempts", 10);
    __publicField(this, "enemyKillCounter", 0);
    this.app = app;
    this.playerEntity = playerEntity;
    this._initDifficultyScaling();
  }
  spawnEnemy(modelUrl, textureUrl, scale, isElite = false) {
    const spawnPosition = this._findSpawnPosition();
    const { health, speed, damage } = this._getStatsForType(isElite);
    const enemy = new Enemy(
      this.app,
      modelUrl,
      textureUrl,
      scale,
      this.playerEntity.entity,
      spawnPosition,
      health,
      speed,
      damage
    );
    if (isElite) enemy.markAsElite();
    spawnPosition.y = 2;
    enemy.entity.setPosition(spawnPosition);
    this.enemies.push(enemy);
  }
  _findSpawnPosition() {
    for (let i = 0; i < this.maxSpawnAttempts; i++) {
      const pos = this._randomSpawnPosition();
      if (this._isValidSpawn(pos)) return pos;
    }
    return this._randomSpawnPosition();
  }
  _randomSpawnPosition() {
    const playerPos = this.playerEntity.entity.getPosition();
    const angle = Math.random() * Math.PI * 2;
    const dist = this.spawnDistance + Math.random() * this.spawnRadius;
    return new pc.Vec3(
      playerPos.x + Math.cos(angle) * dist,
      playerPos.y,
      playerPos.z + Math.sin(angle) * dist
    );
  }
  _isValidSpawn(pos) {
    return this.enemies.every(
      (enemy) => pos.distance(enemy.entity.getPosition()) >= this.minEnemySpacing
    );
  }
  _getStatsForType(isElite) {
    const { health, speed, damage } = this.baseEnemyStats;
    return isElite ? {
      health: health * 6,
      speed: speed * 1.5,
      damage: damage * 2
    } : { health, speed, damage };
  }
  _initDifficultyScaling() {
    this.lastUpgradeTime = 0;
    this.nextUpgradeInterval = 30 + Math.random() * 30;
    this.lastEliteSpawnTime = 0;
    this.eliteInterval = 180;
    this.baseEnemyStats = { health: 20, speed: 2, damage: 10 };
  }
  _updateDifficulty(dt) {
    this.lastUpgradeTime += dt;
    this.lastEliteSpawnTime += dt;
    if (this.lastUpgradeTime >= this.nextUpgradeInterval) {
      const stats = this.baseEnemyStats;
      stats.health += 5;
      stats.speed += 0.2;
      stats.damage += 2;
      console.log("⬆️ Enemy difficulty increased!", stats);
      this.lastUpgradeTime = 0;
      this.nextUpgradeInterval = 30 + Math.random() * 30;
    }
  }
  update(dt) {
    this._updateDifficulty(dt);
    this.enemySpawnTimer += dt;
    if (this.lastEliteSpawnTime >= this.eliteInterval) {
      this.spawnEnemy(`${BASE_PATH$2}/assets/models/Skeleton_Minion.glb`, `${BASE_PATH$2}/assets/textures/skeleton_texture.png`, 0.6, true);
      this.lastEliteSpawnTime = 0;
    }
    if (this.enemySpawnTimer >= this.enemySpawnCooldown) {
      this.spawnEnemy(`${BASE_PATH$2}/assets/models/Skeleton_Minion.glb`, `${BASE_PATH$2}/assets/textures/skeleton_texture.png`, 0.4);
      this.enemySpawnTimer = 0;
    }
    this._updateEnemies(dt);
  }
  _updateEnemies(dt) {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      if (!enemy || enemy.entity.position.y < -1) {
        this._removeEnemy(i);
        continue;
      }
      if (!enemy.isAlive && enemy.entity.isReadyForDestruction) {
        this._removeEnemy(i);
        continue;
      }
      enemy.update(dt);
    }
  }
  _removeEnemy(index) {
    const enemy = this.enemies[index];
    if (enemy == null ? void 0 : enemy.entity) enemy.entity.destroy();
    this.enemies.splice(index, 1);
  }
  getEnemies() {
    return this.enemies;
  }
}
class AmmoDebugDrawer {
  constructor(app, opts = {}) {
    if (!window.Ammo) {
      console.warn("Warning! Trying to initialize Ammo Debug Drawer without Ammo lib in the project. Aborting.");
      return;
    }
    const scene = app.scene;
    const layers = scene.layers;
    const self = this;
    const drawLayer = opts.layer || layers.getLayerByName("Debug Draw") || layers.getLayerById(pc.LAYERID_UI);
    const { entity, distance, ignorePartials } = opts.limit || {};
    const pool = new AmmoDebugDrawer.Pool();
    const v1 = new pc.Vec3();
    const v2 = new pc.Vec3();
    new pc.Vec3();
    let debugDrawMode = 1;
    let enabled = false;
    const drawer = new Ammo.DebugDrawer();
    drawer.drawLine = drawLine.bind(this);
    drawer.drawContactPoint = drawContactPoint.bind(this);
    drawer.reportErrorWarning = reportErrorWarning.bind(this);
    drawer.draw3dText = draw3dText.bind(this);
    drawer.setDebugMode = setDebugMode.bind(this);
    drawer.getDebugMode = getDebugMode.bind(this);
    drawer.enable = enable.bind(this);
    drawer.disable = disable.bind(this);
    drawer.update = update.bind(this);
    const world = app.systems.rigidbody.dynamicsWorld;
    world.setDebugDrawer(drawer);
    self.clear = clear;
    self.toggle = toggle;
    function reportErrorWarning(warningString) {
    }
    function draw3dText(location2, textString) {
    }
    function drawContactPoint(pointOnB, normalOnB, distance2, lifeTime, color) {
      const p = Ammo.wrapPointer(pointOnB, Ammo.btVector3);
      const n = Ammo.wrapPointer(normalOnB, Ammo.btVector3);
      const c = Ammo.wrapPointer(color, Ammo.btVector3);
      const x = p.x();
      const y = p.y();
      const z = p.z();
      pool.pushPos(x, y, z, x + n.x() * 0.5, y + n.y() * 0.5, z + n.z() * 0.5);
      pool.pushColor(c.x(), c.y(), c.z(), 1, c.x(), c.y(), c.z(), 1);
    }
    function drawLine(from, to, color) {
      const f = Ammo.wrapPointer(from, Ammo.btVector3);
      const t = Ammo.wrapPointer(to, Ammo.btVector3);
      const c = Ammo.wrapPointer(color, Ammo.btVector3);
      if (entity) {
        v1.set(f.x(), f.y(), f.z());
        v2.set(t.x(), t.y(), t.z());
        const pos = entity.getPosition();
        const d1 = pos.distance(v1);
        const d2 = pos.distance(v2);
        if (d1 < distance && d2 < distance || entity && !ignorePartials && (d1 < distance || d2 < distance)) {
          pool.pushPos(v1.x, v1.y, v1.z, v2.x, v2.y, v2.z);
          pool.pushColor(c.x(), c.y(), c.z(), 1, c.x(), c.y(), c.z(), 1);
        }
      } else {
        pool.pushPos(f.x(), f.y(), f.z(), t.x(), t.y(), t.z());
        pool.pushColor(c.x(), c.y(), c.z(), 1, c.x(), c.y(), c.z(), 1);
      }
    }
    function clear() {
      pool.clear();
    }
    function setDebugMode(val) {
      debugDrawMode = val;
    }
    function getDebugMode() {
      return debugDrawMode;
    }
    function enable() {
      self.enabled = true;
    }
    function disable() {
      self.enabled = false;
    }
    function toggle() {
      self.enabled = !enabled;
    }
    function draw() {
      try {
        pool.entries.forEach((entry) => {
          app.drawLineArrays(entry.positions, entry.colors, false, drawLayer);
        });
      } catch (e) {
        console.warn("Error drawing debug lines", e);
        disable();
      }
    }
    function update() {
      if (enabled) world.debugDrawWorld();
    }
    function postUpdate() {
      if (enabled) {
        draw();
        clear();
      }
    }
    Object.defineProperties(self, {
      enabled: {
        get: () => {
          return enabled;
        },
        set: (val) => {
          enabled = val;
          if (enabled) {
            app.systems.on("update", update, self);
            app.systems.on("postUpdate", postUpdate, self);
          } else {
            app.systems.off("update", update, self);
            app.systems.off("postUpdate", postUpdate, self);
            clear();
          }
        }
      },
      // 0: Disable
      // 1: Wireframe
      // 2: Bounding Boxes
      // 3: Wireframe + AABB
      // 8: Contact Points
      mode: {
        get: () => {
          return debugDrawMode;
        },
        set: (val) => {
          debugDrawMode = val;
        }
      }
    });
  }
}
AmmoDebugDrawer.Pool = class Pool {
  constructor() {
    const self = this;
    const pool = /* @__PURE__ */ new Map();
    const MAX_SIZE = 64e3;
    let index = 0;
    pool.set(index, { "positions": [], "colors": [] });
    self.entries = pool;
    self.clear = clear;
    self.pushColor = pushColor;
    self.pushPos = pushPos;
    _add(index);
    function clear() {
      pool.clear();
      index = 0;
      _add(index);
    }
    function pushColor(r1, g1, b1, a1, r2, g2, b2, a2) {
      const entry = _getEntry("colors", 8);
      entry.colors.push(r1, g1, b1, a1, r2, g2, b2, a2);
    }
    function pushPos(x1, y1, z1, x2, y2, z2) {
      const entry = _getEntry("positions", 6);
      entry.positions.push(x1, y1, z1, x2, y2, z2);
    }
    function _add(index2) {
      const entry = { positions: [], colors: [] };
      pool.set(index2, entry);
      return entry;
    }
    function _getEntry(buffer, increment) {
      let entry = pool.get(index);
      if (entry[buffer].length + increment > MAX_SIZE) {
        entry = _add(++index);
      }
      return entry;
    }
  }
};
class CameraHandler {
  constructor(app, targetEntity, cameraOffset = new pc.Vec3(0, 10, 10), followSpeed = 5) {
    __publicField(this, "smoothing", 10);
    __publicField(this, "newPosition", new pc.Vec3());
    this.app = app;
    this.targetEntity = targetEntity;
    this.cameraOffset = cameraOffset;
    this.followSpeed = followSpeed;
    this.targetPos = new pc.Vec3();
    this._createCamera();
    this._initDebugDrawer();
    this.app.root.addChild(this.entity);
    this.updateCameraPosition(1);
  }
  _createCamera() {
    this.entity = new pc.Entity("MainCamera");
    this.entity.addComponent("camera", {
      clearColor: new pc.Color(0.1, 0.1, 0.1),
      farClip: 1e3
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
      console.warn("Debug drawer init failed:", err);
    }
  }
  update(dt = 1 / 60) {
    var _a, _b;
    if (!this.targetEntity || !this.entity) return;
    this.updateCameraPosition(dt);
    (_b = (_a = this.debugDrawer) == null ? void 0 : _a.update) == null ? void 0 : _b.call(_a);
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
    var _a, _b, _c, _d;
    (_b = (_a = this.debugDrawer) == null ? void 0 : _a.destroy) == null ? void 0 : _b.call(_a);
    (_d = (_c = this.entity) == null ? void 0 : _c.destroy) == null ? void 0 : _d.call(_c);
  }
}
let Map$1 = class Map2 {
  constructor(app, mapTextureUrl, playerEntity) {
    this.app = app;
    this.playerEntity = playerEntity;
    this.mapMaterial = new pc.StandardMaterial();
    this._createMapEntity();
    this._loadMapTexture(mapTextureUrl);
    this._restrictPlayerWithinBounds();
  }
  _createMapEntity() {
    this.entity = new pc.Entity("Map");
    this.entity.addComponent("model", { type: "plane" });
    this.entity.setLocalScale(400, 1, 400);
    this.entity.addComponent("collision", {
      type: "box",
      halfExtents: new pc.Vec3(400, 0.1, 400),
      group: COLLISION_GROUPS.GROUND,
      mask: COLLISION_GROUPS.ENEMY | COLLISION_GROUPS.PLAYER
    });
    this.entity.addComponent("rigidbody", {
      type: "static",
      restitution: 0.5,
      friction: 0.6,
      enable: true,
      group: COLLISION_GROUPS.GROUND,
      mask: COLLISION_GROUPS.ENEMY | COLLISION_GROUPS.PLAYER
    });
    this.app.root.addChild(this.entity);
  }
  _loadMapTexture(textureUrl) {
    this.app.assets.loadFromUrl(textureUrl, "texture", (err, asset) => {
      var _a, _b;
      if (err) return console.error("Error loading texture:", err);
      if (!(asset == null ? void 0 : asset.resource)) return;
      const tex = asset.resource;
      tex.addressU = pc.ADDRESS_REPEAT;
      tex.addressV = pc.ADDRESS_REPEAT;
      this.mapMaterial.diffuseMap = tex;
      this.mapMaterial.diffuseMapTiling = new pc.Vec2(50, 50);
      this.mapMaterial.update();
      const mesh = (_b = (_a = this.entity.model) == null ? void 0 : _a.meshInstances) == null ? void 0 : _b[0];
      if (mesh) {
        mesh.material = this.mapMaterial;
      } else {
        console.error("Map model or mesh instance not found.");
      }
    });
  }
  _restrictPlayerWithinBounds() {
    this.app.on("update", () => {
      const pos = this.playerEntity.getPosition();
      const clampedX = Math.max(-100, Math.min(100, pos.x));
      const clampedZ = Math.max(-100, Math.min(100, pos.z));
      if (clampedX !== pos.x || clampedZ !== pos.z) {
        this.playerEntity.setPosition(clampedX, pos.y, clampedZ);
      }
    });
  }
};
class UIManager {
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
    const elapsed = Math.floor((Date.now() - this.gameTimer.startTime) / 1e3);
    const { hours, minutes, seconds } = this.secondsToTime(elapsed);
    Object.assign(this.gameTimer, { hours, minutes, seconds });
    this.updateElementText("hours", hours);
    this.updateElementText("minutes", minutes);
    this.updateElementText("seconds", seconds);
  }
  updateElementText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = String(value).padStart(2, "0");
  }
  secondsToTime(totalSeconds) {
    return {
      hours: Math.floor(totalSeconds / 3600),
      minutes: Math.floor(totalSeconds % 3600 / 60),
      seconds: totalSeconds % 60
    };
  }
  updateHPBar(currentHP, maxHP) {
    const hpFill = document.getElementById("hp-fill");
    const hpText = document.getElementById("hp-text");
    if (!hpFill || !hpText) return;
    const percent = currentHP / maxHP * 100;
    hpFill.style.width = `${percent}%`;
    hpText.textContent = `${currentHP}/${maxHP}`;
    hpFill.style.background = this.getHPColor(percent);
  }
  getHPColor(percent) {
    if (percent <= 25) return "linear-gradient(90deg, #ff0000, #ff4400)";
    return "linear-gradient(90deg, #ff4400, #ff6b00)";
  }
  updateXPBar(currentXP, xpToLevelUp, level) {
    const xpFill = document.getElementById("xp-fill");
    const xpText = document.getElementById("xp-text");
    if (!xpFill || !xpText) return;
    const percent = currentXP / xpToLevelUp * 100;
    const formatted = percent.toFixed(1);
    xpFill.style.width = `${formatted}%`;
    xpText.textContent = `${formatted}% - Level ${level}`;
  }
  showUpgradePanel(upgrades, applyCallback) {
    const panel = document.getElementById("upgrade-panel");
    const container = document.getElementById("upgrade-cards");
    if (!panel || !container) return;
    panel.classList.remove("hide");
    container.innerHTML = "";
    upgrades.forEach((upgrade) => {
      const card = document.createElement("div");
      card.className = "upgrade-card";
      card.innerHTML = `<strong>${upgrade.title}</strong><br>${upgrade.description}`;
      card.onclick = () => {
        panel.classList.add("hide");
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
    return Math.floor((Date.now() - this.gameTimer.startTime) / 1e3);
  }
}
const BASE_PATH$1 = window.location.pathname.includes("purus-internship-game") ? "/purus-internship-game" : "";
const AUDIO_DEFS = {
  bgm: { url: `${BASE_PATH$1}/assets/sounds/You-have-no-enemies.mp3`, loop: true },
  attack: { url: `${BASE_PATH$1}/assets/sounds/Magic-staff-shoot.wav` },
  hit: { url: `${BASE_PATH$1}/assets/sounds/Hurt.mp3` }
};
const createAudioAssets = (app) => Object.fromEntries(
  Object.entries(AUDIO_DEFS).map(([key, { url }]) => [
    key,
    new pc.Asset(`${key}-sound`, "audio", { url })
  ])
);
class AudioManager {
  constructor() {
    __publicField(this, "bgmVolume", 0.5);
    __publicField(this, "sfxVolume", 1);
    __publicField(this, "sounds", {});
  }
  async initialize(app) {
    this.app = app;
    this.audioAssets = createAudioAssets();
    this.soundEntity = new pc.Entity("sound");
    this.soundEntity.addComponent("sound");
    this.app.root.addChild(this.soundEntity);
    Object.values(this.audioAssets).forEach((asset) => this.app.assets.add(asset));
    await Promise.all(
      Object.entries(this.audioAssets).map(
        ([key, asset]) => new Promise((resolve) => {
          asset.once("load", () => {
            this.soundEntity.sound.addSlot(key, {
              name: key,
              asset,
              volume: key === "bgm" ? this.bgmVolume : this.sfxVolume,
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
    this._play("bgm");
  }
  playSFX(name) {
    this._play(name);
  }
  _play(name) {
    var _a, _b;
    (_b = (_a = this.soundEntity) == null ? void 0 : _a.sound) == null ? void 0 : _b.play(name);
  }
  setBGMVolume(vol) {
    this.bgmVolume = pc.math.clamp(vol, 0, 1);
    this.sounds.bgm && (this.sounds.bgm.volume = this.bgmVolume);
  }
  setSFXVolume(vol) {
    this.sfxVolume = pc.math.clamp(vol, 0, 1);
    for (const [key, slot] of Object.entries(this.sounds)) {
      if (key !== "bgm") slot.volume = this.sfxVolume;
    }
  }
}
class MagicStaff extends pc.EventHandler {
  constructor(app, playerEntity, enemies, damage = 10) {
    super();
    // Stats
    __publicField(this, "fireRate", 1.8);
    __publicField(this, "fireTimer", 0);
    __publicField(this, "attackRange", 10);
    __publicField(this, "speed", 15);
    __publicField(this, "projectileCount", 1);
    __publicField(this, "maxProjectiles", 8);
    __publicField(this, "projectiles", []);
    // Upgrade stuffs
    __publicField(this, "weaponLevel", 1);
    __publicField(this, "maxLevel", 16);
    __publicField(this, "upgradeStats", {
      damage: 5,
      fireRateReduction: 0.2
    });
    Object.assign(this, { app, playerEntity, enemies, damage });
  }
  fireProjectile(target) {
    this.fire("attack");
    const projectiles = Array.from(
      { length: this.projectileCount },
      (_, i) => this.spawnSingleProjectile(target, i, this.projectileCount)
    );
    this.app.on("update", (function moveProjectiles(dt) {
      if (isPaused) return;
      for (const p of projectiles) {
        const { entity, direction } = p;
        if (entity == null ? void 0 : entity.enabled) {
          const currentPos = entity.getPosition();
          const newPos = currentPos.clone().add(direction.clone().mulScalar(this.speed * dt));
          entity.setPosition(newPos);
        }
      }
    }).bind(this));
  }
  spawnSingleProjectile(target, index, total) {
    var _a;
    const projectile = new pc.Entity("Projectile");
    projectile.tags.add("projectile");
    projectile.addComponent("model", { type: "sphere" });
    const material = new pc.StandardMaterial();
    material.diffuse = new pc.Color(1, 0, 0);
    material.update();
    (_a = projectile.model) == null ? void 0 : _a.meshInstances.forEach((mi) => mi.material = material);
    projectile.addComponent("collision", {
      type: "sphere",
      radius: 0.1,
      group: COLLISION_GROUPS.PROJECTILE,
      mask: COLLISION_GROUPS.ENEMY
    });
    projectile.addComponent("rigidbody", {
      type: "kinematic",
      group: COLLISION_GROUPS.PROJECTILE
    });
    projectile.rigidbody.applyGravity = false;
    projectile.setLocalScale(0.15, 0.15, 0.15);
    projectile.enabled = true;
    projectile.collision.on("collisionstart", (contact) => {
      var _a2, _b, _c, _d;
      if ((_b = (_a2 = contact.other) == null ? void 0 : _a2.tags) == null ? void 0 : _b.has("enemy")) {
        (_d = (_c = contact.other.script) == null ? void 0 : _c.enemy) == null ? void 0 : _d.takeDamage(this.damage);
        this.fire("enemyHit");
        projectile.destroy();
      }
    });
    const startPos = this.playerEntity.getPosition().clone().add(new pc.Vec3(0, 0.5, 0));
    projectile.setPosition(startPos);
    let direction = this.computeProjectileDirection(startPos, target, index, total);
    this.app.root.addChild(projectile);
    setTimeout(() => {
      if (projectile.enabled) projectile.destroy();
    }, 3500);
    return { entity: projectile, direction };
  }
  computeProjectileDirection(startPos, target, index, total) {
    let direction = this.playerEntity.forward.clone();
    if (target) {
      const targetPos = target.getPosition().clone().add(new pc.Vec3(0, 0.5, 0));
      direction = targetPos.sub(startPos);
    } else {
      direction = new pc.Vec3(0, 0, 1);
      this.playerEntity.getRotation().transformVector(direction, direction);
    }
    direction.y = 0;
    direction.normalize();
    if (total > 1) {
      const angleSpread = Math.min(60, 10 + (total - 1) * 10);
      const step = angleSpread / (total - 1 || 1);
      const offset = -angleSpread / 2 + step * index;
      const rad = pc.math.DEG_TO_RAD * offset;
      const sin = Math.sin(rad), cos = Math.cos(rad);
      direction = new pc.Vec3(
        direction.x * cos - direction.z * sin,
        0,
        direction.x * sin + direction.z * cos
      ).normalize();
    }
    return direction;
  }
  findNearestEnemy() {
    let nearest = null;
    let minDist = Infinity;
    for (const enemy of this.enemies) {
      if (!enemy.isAlive) continue;
      const dist = this.playerEntity.getPosition().distance(enemy.getEntity().getPosition());
      if (dist < minDist) {
        nearest = enemy;
        minDist = dist;
      }
    }
    return nearest;
  }
  setEnemies(enemies) {
    this.enemies = enemies;
  }
  update(dt) {
    if (isPaused || !this.playerEntity) return;
    this.fireTimer += dt;
    if (this.fireTimer >= this.fireRate) {
      const nearestEnemy = this.findNearestEnemy();
      const distance = nearestEnemy ? this.playerEntity.getPosition().distance(nearestEnemy.getEntity().getPosition()) : Infinity;
      this.fireProjectile(distance < this.attackRange ? nearestEnemy.getEntity() : null);
      this.fireTimer = 0;
    }
  }
}
class MagicBox extends pc.EventHandler {
  constructor(app, playerEntity, enemies, damage = 10, count = 3, radius = 1.5) {
    super();
    this.app = app;
    this.playerEntity = playerEntity;
    this.enemies = enemies;
    this.damage = damage;
    this.projectileCount = count;
    this.radius = radius;
    this.projectiles = [];
    this.rotationSpeed = 1;
    this.angleOffset = Math.random() * Math.PI * 2;
    this.initProjectiles();
    this.app.on("update", this.update.bind(this));
  }
  initProjectiles() {
    this.projectiles.forEach((p) => p.destroy());
    this.projectiles = [];
    for (let i = 0; i < this.projectileCount; i++) {
      const p = this._createProjectile(i);
      this.projectiles.push(p);
      this.app.root.addChild(p);
    }
  }
  _createProjectile(index) {
    var _a;
    const projectile = new pc.Entity(`MagicBoxProjectile_${index}`);
    projectile.tags.add("projectile");
    projectile.addComponent("model", { type: "box" });
    projectile.setLocalScale(0.2, 0.2, 0.2);
    const mat = new pc.StandardMaterial();
    mat.diffuse = new pc.Color(0.8, 0.67, 0.49);
    mat.update();
    (_a = projectile.model) == null ? void 0 : _a.meshInstances.forEach((m) => m.material = mat);
    projectile.addComponent("collision", {
      type: "sphere",
      radius: 0.2,
      group: COLLISION_GROUPS.PROJECTILE,
      mask: COLLISION_GROUPS.ENEMY
    });
    projectile.addComponent("rigidbody", {
      type: "kinematic",
      group: COLLISION_GROUPS.PROJECTILE
    });
    const hitHandler = (contact) => this._onHit(contact);
    projectile.collision.on("collisionstart", hitHandler);
    projectile.collision.on("collisionstay", hitHandler);
    return projectile;
  }
  _onHit(contact) {
    var _a, _b;
    const enemy = (_b = (_a = contact.other) == null ? void 0 : _a.script) == null ? void 0 : _b.enemy;
    if (!enemy) return;
    enemy.takeDamage(this.damage);
    this.fire("enemyHit");
    const enemyEntity = contact.other;
    const playerPos = this.playerEntity.getPosition().clone();
    const enemyPos = enemyEntity.getPosition().clone();
    const pushDir = new pc.Vec3().sub2(enemyPos, playerPos).normalize();
    const newPos = enemyPos.add(pushDir.scale(0.25));
    enemyEntity.rigidbody.teleport(newPos, enemyEntity.getRotation());
  }
  update(dt) {
    if (isPaused || !this.playerEntity) return;
    this.angleOffset += dt * this.rotationSpeed;
    const center = this.playerEntity.getPosition();
    const height = center.y + 0.5;
    const angleStep = 2 * Math.PI / this.projectileCount;
    for (let i = 0; i < this.projectiles.length; i++) {
      const angle = this.angleOffset + i * angleStep;
      const x = center.x + this.radius * Math.cos(angle);
      const z = center.z + this.radius * Math.sin(angle);
      const projectile = this.projectiles[i];
      projectile.setPosition(x, height, z);
      projectile.setEulerAngles(angle * 30, angle * 45, angle * 60);
    }
  }
}
class UpgradeSystem {
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
      { title: "🔥 +15% Damage", type: "damage", value: 0.15, description: "Increases damage of all weapons by 15%" },
      { title: "💓 +25 Max HP", type: "maxHealth", value: 25, description: "Increases max HP by 25 points" },
      { title: "⚡ +20% Speed", type: "speed", value: 0.2, description: "Increases movement speed by 20%" },
      { title: "🧲 +1m Pickup Range", type: "collectRange", value: 1, description: "Increases pickup range by 1 metre" },
      { title: "🌀 +10% Attack Speed", type: "fireRateBoost", value: 0.1, description: "Increases attack speed of all weapons by 10%" },
      { title: "🔫 Magic Staff Upgrade", type: "magicStaff", value: 1, description: "+1 projectile" },
      { title: "📦 Magic Box Upgrade", type: "magicBox", value: 1, description: "+1 projectile" }
    ];
  }
  getRandomUpgrades(count = 3) {
    const available = this.upgradePool.filter((up) => {
      var _a, _b;
      if (up.type === "magicStaff") {
        return ((_a = this.magicStaff) == null ? void 0 : _a.projectileCount) < ((_b = this.magicStaff) == null ? void 0 : _b.maxProjectiles);
      }
      if (up.type === "magicBox") {
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
      case "damage":
        this.magicStaff && (this.magicStaff.damage *= 1 + value);
        this.magicBox ? this.magicBox.damage *= 1 + value : this.accumulatedDamageBoost++;
        break;
      case "maxHealth":
        this.player.maxHealth += value;
        this.player.health = this.player.maxHealth;
        break;
      case "speed":
        this.player.speed *= 1 + value;
        break;
      case "collectRange":
        this.player.collectRange += value;
        break;
      case "fireRateBoost":
        if (this.magicStaff) {
          this.magicStaff.fireRate = Math.max(0.1, this.magicStaff.fireRate - value);
        }
        this.magicBox ? this.magicBox.rotationSpeed *= 1 + value : this.accumulatedFireRateBoost++;
        break;
      case "magicStaff":
        this._upgradeMagicStaff();
        break;
      case "magicBox":
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
      console.log("🔓 Magic Box unlocked!");
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
    this.uiManager.showUpgradePanel(upgrades, async (chosen) => {
      await this.applyUpgrade(chosen);
    });
  }
}
const BASE_PATH = window.location.pathname.includes("purus-internship-game") ? "/purus-internship-game" : "";
class GameManager {
  constructor() {
    this.app = null;
    this.physicsWorld = null;
    this.AmmoLib = null;
    this.player = null;
    this.enemyManager = null;
    this.upgradeSystem = null;
    this.map = null;
    this.cameraHandler = null;
    this.uiManager = new UIManager();
    this.audioManager = null;
    this.accumulator = 0;
    this.elapsedTime = 0;
    this._setupUI();
  }
  _setupUI() {
    this.uiManager.initialize(() => isPaused, () => isGuided);
    const restartBtn = document.getElementById("restart-button");
    restartBtn == null ? void 0 : restartBtn.addEventListener("click", () => this.restartGame());
  }
  async initializeGame() {
    try {
      this.AmmoLib = await this._loadAmmoJS();
      window.Ammo = this.AmmoLib;
      await this._initializePlayCanvas();
      this.audioManager = new AudioManager();
      await this.audioManager.initialize(this.app);
      this.audioManager.playBGM();
      this.audioManager.setBGMVolume(0.2);
      this.audioManager.setSFXVolume(0.4);
      await this._initializePhysics();
      this.setupLight();
      this.initializePlayer();
      this.initializeEnemyManager();
      this.initializeUpgradeSystem();
      this.initializeMapAndCamera();
      this.setupUpdateLoop();
      console.log("✅ Game initialized successfully");
    } catch (err) {
      console.error("❌ Game initialization error:", err);
      throw err;
    }
  }
  async _loadAmmoJS() {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/gh/kripken/ammo.js@HEAD/builds/ammo.wasm.js";
      script.onload = async () => {
        if (typeof Ammo === "function") {
          try {
            const ammo = await Ammo();
            resolve(ammo);
          } catch (err) {
            reject(new Error(`Ammo init failed: ${err.message}`));
          }
        } else {
          reject(new Error("Ammo not available"));
        }
      };
      script.onerror = () => reject(new Error("Ammo.js failed to load"));
      document.head.appendChild(script);
    });
  }
  async _initializePlayCanvas() {
    const canvas = document.getElementById("application-canvas");
    if (!canvas) throw new Error("Canvas element not found");
    this.app = new pc.Application(canvas);
    this.app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
    this.app.setCanvasResolution(pc.RESOLUTION_AUTO);
    this.app.mouse = new pc.Mouse(canvas);
    this.app.keyboard = new pc.Keyboard(window);
    this.app.touch = new pc.TouchDevice(canvas);
    this.app.elementInput = new pc.ElementInput(canvas);
    const scene = new pc.Entity("Scene");
    this.app.root.addChild(scene);
    this.app.start();
    window.addEventListener("resize", () => this.app.resizeCanvas());
  }
  async _initializePhysics() {
    const Ammo2 = this.AmmoLib;
    const config = new Ammo2.btDefaultCollisionConfiguration();
    const dispatcher = new Ammo2.btCollisionDispatcher(config);
    const broadphase = new Ammo2.btDbvtBroadphase();
    const solver = new Ammo2.btSequentialImpulseConstraintSolver();
    this.physicsWorld = new Ammo2.btDiscreteDynamicsWorld(dispatcher, broadphase, solver, config);
    this.physicsWorld.setGravity(new Ammo2.btVector3(0, -9.81, 0));
    await new Promise((r) => setTimeout(r, 100));
    if (!this.app.systems.rigidbody) throw new Error("RigidBody system not ready");
    this.app.systems.rigidbody.physicsWorld = this.physicsWorld;
  }
  setupLight() {
    const light = new pc.Entity("DirectionalLight");
    light.addComponent("light", {
      type: pc.LIGHTTYPE_DIRECTIONAL,
      color: new pc.Color(1, 1, 1),
      castShadows: true,
      intensity: 1
    });
    light.setEulerAngles(45, 30, 0);
    this.app.root.addChild(light);
  }
  initializePlayer() {
    this.player = new Player(this.app, `${BASE_PATH}/assets/models/Mage.glb`, `${BASE_PATH}/assets/textures/mage_texture.png`, 0.4, []);
  }
  initializeEnemyManager() {
    this.enemyManager = new EnemyManager(this.app, this.player);
  }
  initializeUpgradeSystem() {
    const enemies = this.enemyManager.getEnemies();
    this.upgradeSystem = new UpgradeSystem(this.app, this.player, this.uiManager, enemies);
    this.upgradeSystem.magicStaff.on("attack", () => this.audioManager.playSFX("attack"));
    this.upgradeSystem.magicStaff.on("enemyHit", () => this.audioManager.playSFX("hit"));
    this.app.on("magicBoxUnlocked", () => {
      var _a;
      (_a = this.upgradeSystem.magicBox) == null ? void 0 : _a.on("enemyHit", () => this.audioManager.playSFX("hit"));
    });
    this.player.on("levelup", () => this.upgradeSystem.handleLevelUp());
  }
  initializeMapAndCamera() {
    this.map = new Map$1(this.app, "textures/grass_texture.jpg", this.player);
    this.cameraHandler = new CameraHandler(this.app, this.player.entity, new pc.Vec3(0, 10, 10), 10);
    this.cameraHandler.smoothing = 15;
    this.app.root.on("xpCollected", () => this.audioManager.playSFX("collect"));
  }
  setupUpdateLoop() {
    const STEP = 1 / 60;
    this.app.on("update", (dt) => {
      var _a, _b;
      this.cameraHandler.update(dt);
      if (isPaused || isGuided) return;
      this.accumulator += dt;
      while (this.accumulator >= STEP) {
        this.physicsWorld.stepSimulation(STEP, 1);
        this.accumulator -= STEP;
      }
      if (this.player && this.enemyManager) {
        this.player.setEnemies(this.enemyManager.getEnemies());
        this.enemyManager.update(dt);
        this.player.update(dt);
        this.uiManager.updateHPBar(this.player.health, this.player.maxHealth);
        this.uiManager.updateXPBar(this.player.xp, this.player.xpToLevelUp, this.player.level);
        this.uiManager.updateTimer();
        (_a = this.upgradeSystem.magicStaff) == null ? void 0 : _a.update(dt);
        (_b = this.upgradeSystem.magicBox) == null ? void 0 : _b.update(dt);
      }
      this.elapsedTime += dt;
      window.gameElapsedTime = this.elapsedTime;
    });
  }
  startGame() {
    var _a, _b;
    (_a = document.getElementById("start-screen")) == null ? void 0 : _a.classList.add("hide");
    setPaused(false);
    (_b = document.getElementById("ingame-ui")) == null ? void 0 : _b.classList.add("show");
    const movementGuide = document.getElementById("movement-guide");
    const attackGuide = document.getElementById("attack-guide");
    movementGuide == null ? void 0 : movementGuide.classList.add("show");
    const keys = { w: false, a: false, s: false, d: false };
    const onKey = (e) => {
      var _a2;
      const key = e.key.toLowerCase();
      if (!keys.hasOwnProperty(key)) return;
      keys[key] = true;
      (_a2 = document.querySelector(`[data-key="${key}"]`)) == null ? void 0 : _a2.classList.add("pressed");
      if (Object.values(keys).every(Boolean)) {
        setGuided(false);
        this.uiManager.initializeTimer();
        setTimeout(() => {
          movementGuide == null ? void 0 : movementGuide.classList.replace("show", "hide");
          window.removeEventListener("keydown", onKey);
          attackGuide == null ? void 0 : attackGuide.classList.add("show");
        }, 1500);
        setTimeout(() => {
          attackGuide == null ? void 0 : attackGuide.classList.remove("show");
          attackGuide == null ? void 0 : attackGuide.classList.add("hide");
        }, 5e3);
      }
    };
    window.addEventListener("keydown", onKey);
  }
  showGameOver() {
    var _a, _b, _c, _d;
    const h = (_a = document.getElementById("hours")) == null ? void 0 : _a.textContent;
    const m = (_b = document.getElementById("minutes")) == null ? void 0 : _b.textContent;
    const s = (_c = document.getElementById("seconds")) == null ? void 0 : _c.textContent;
    const finalTime = document.getElementById("final-time");
    finalTime && (finalTime.textContent = `Time Survived: ${h}:${m}:${s}`);
    (_d = document.getElementById("game-over-screen")) == null ? void 0 : _d.classList.add("show");
  }
  hideGameOver() {
    var _a;
    (_a = document.getElementById("game-over-screen")) == null ? void 0 : _a.classList.remove("show");
  }
  async restartGame() {
    location.reload();
  }
  cleanupGameObjects() {
    this.app.root.children.slice().forEach((e) => e !== this.app.root && e.destroy());
    this.app.mouse.detachAll();
    this.app.keyboard.detachAll();
    this.app.touch.detachAll();
  }
  getUIManager() {
    return this.uiManager;
  }
  getAudioManager() {
    return this.audioManager;
  }
  getPlayer() {
    return this.player;
  }
  getEnemyManager() {
    return this.enemyManager;
  }
}
window.addEventListener("DOMContentLoaded", () => {
  console.log("DOM Content Loaded - Starting game initialization");
  const loadingDiv = document.createElement("div");
  loadingDiv.style.cssText = "position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.8); color: white; padding: 20px; border-radius: 5px; z-index: 1000;";
  loadingDiv.textContent = "Loading game...";
  document.body.appendChild(loadingDiv);
  const gameManager = new GameManager();
  window.gameManager = gameManager;
  gameManager.initializeGame().then(() => {
    loadingDiv.remove();
    document.getElementById("start-button").addEventListener("click", () => {
      gameManager.startGame();
    });
  }).catch((error) => {
    console.error("Error initializing game:", error);
    loadingDiv.style.background = "rgba(255,0,0,0.8)";
    loadingDiv.textContent = `Game initialization failed: ${error.message}. Please check console for details.`;
  });
});
