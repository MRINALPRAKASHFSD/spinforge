/**
 * SPINFORGE - SpinningTop
 * Represents a battle top entity with 2D rigid-body kinematics, angular momentum,
 * stamina decay modeling, wobble precession dynamics, and burst durability.
 */

import { Vector2 } from './Vector2.js';
import { TOP_DEFAULTS, TOP_ARCHETYPES, PHYSICS_LIMITS } from './constants.js';

export class SpinningTop {
  /**
   * @param {Object} config
   * @param {string} [config.id]
   * @param {string} [config.name]
   * @param {string} [config.owner] 'player' | 'cpu' | 'dummy'
   * @param {string} [config.archetype] 'attack' | 'defense' | 'stamina' | 'balance'
   * @param {number} [config.radius]
   * @param {number} [config.mass]
   * @param {number} [config.maxRpm]
   * @param {number} [config.attackPower]
   * @param {number} [config.defensePower]
   * @param {number} [config.staminaRating]
   * @param {number} [config.burstResistance]
   * @param {number} [config.spinDirection] 1 for Right (CW), -1 for Left (CCW)
   * @param {number} [config.grip] Tip friction / traction coefficient
   * @param {string} [config.primaryColor]
   * @param {string} [config.accentColor]
   * @param {string} [config.coreColor]
   * @param {number} [config.bladePoints]
   */
  constructor(config = {}) {
    this.id = config.id || `top_${Math.random().toString(36).slice(2, 9)}`;
    this.name = config.name || 'Vortex Striker';
    this.owner = config.owner || 'player';
    this.archetype = config.archetype || TOP_ARCHETYPES.BALANCE;

    // Physical dimensions, mass, and moment of inertia
    this.radius = config.radius ?? TOP_DEFAULTS.RADIUS;
    this.mass = Math.max(0.2, config.mass ?? TOP_DEFAULTS.MASS);
    // Inertia of solid circular disc: I = 0.5 * m * r^2
    this.momentOfInertia = 0.5 * this.mass * Math.pow(this.radius, 2);

    // Position & velocity vectors
    this.position = new Vector2(0, 0);
    this.previousPosition = new Vector2(0, 0);
    this.velocity = new Vector2(0, 0);

    // Angular kinematics
    this.rotationAngle = 0; // Visual angle in radians
    this.previousRotationAngle = 0;
    this.maxRpm = config.maxRpm ?? TOP_DEFAULTS.DEFAULT_MAX_RPM;
    this.rpm = this.maxRpm;
    this.spinDirection = config.spinDirection ?? 1; // 1 = CW, -1 = CCW

    // Tip surface grip (affects traction, curve drift, and surface friction)
    this.grip = config.grip ?? 0.5;

    // Visual impact feedback
    this.impactFlashTimer = 0;

    // Dynamic wobble / precession
    this.wobbleMagnitude = 0; // 0 (upright) to 1.0 (severe tilt/scrape)
    this.wobbleAngle = 0;
    this.wobbleSpeed = 8; // Precession frequency

    // Attributes / Combat stats
    this.attackPower = config.attackPower ?? 50;
    this.defensePower = config.defensePower ?? 50;
    this.staminaRating = config.staminaRating ?? 50;
    this.maxBurstResistance = config.burstResistance ?? TOP_DEFAULTS.BURST_RESISTANCE;
    this.burstResistance = this.maxBurstResistance;

    // Visual attributes
    this.primaryColor = config.primaryColor || '#00e5ff';
    this.accentColor = config.accentColor || '#ff0077';
    this.coreColor = config.coreColor || '#ffe600';
    this.bladePoints = config.bladePoints || 4;

    // Lifecycle & elimination state
    this.isAlive = true;
    this.isBurst = false;
    this.isRingOut = false;
    this.isSleeping = false;
    this.eliminationTime = null; // Timestamp of elimination for simultaneous check
    this.eliminationReason = null; // 'BURST', 'OVER', 'RING_OUT', 'SLEEP'

    // Match telemetry
    this.spinTime = 0;
    this.collisionsCount = 0;
    this.maxImpactDealt = 0;
    this.maxImpactTaken = 0;
  }

  /**
   * Launch the top into the arena.
   * @param {Vector2} position
   * @param {Vector2} launchVelocity
   * @param {number} launchRpm
   */
  launch(position, launchVelocity, launchRpm) {
    this.position.copy(position);
    this.previousPosition.copy(position);
    this.velocity.copy(launchVelocity);
    this.maxRpm = Math.max(1000, Math.min(PHYSICS_LIMITS.MAX_RPM, launchRpm));
    this.rpm = this.maxRpm;
    this.rotationAngle = 0;
    this.previousRotationAngle = 0;
    this.impactFlashTimer = 0;
    this.wobbleMagnitude = 0;
    this.wobbleAngle = 0;
    this.burstResistance = this.maxBurstResistance;

    this.isAlive = true;
    this.isBurst = false;
    this.isRingOut = false;
    this.isSleeping = false;
    this.eliminationTime = null;
    this.eliminationReason = null;

    this.spinTime = 0;
    this.collisionsCount = 0;
    this.maxImpactDealt = 0;
    this.maxImpactTaken = 0;
  }

  /**
   * Returns angular velocity in radians per second.
   * @returns {number}
   */
  getAngularVelocity() {
    return (this.rpm / 60) * (Math.PI * 2) * this.spinDirection;
  }

  /**
   * Applies an instantaneous linear force / impulse vector.
   * @param {Vector2} force
   */
  applyForce(force) {
    if (!this.isAlive) return;
    const accel = force.clone().divide(this.mass);
    this.velocity.add(accel);
    this._clampVelocity();
  }

  /**
   * Applies an angular impulse (torque * dt) altering RPM.
   * @param {number} torqueImpulse
   */
  applyTorqueImpulse(torqueImpulse) {
    if (!this.isAlive) return;
    // Delta omega = J_torque / I
    const deltaOmega = torqueImpulse / this.momentOfInertia;
    const deltaRpm = (deltaOmega / (Math.PI * 2)) * 60;

    // Apply change with spin direction awareness
    if (this.spinDirection === 1) {
      this.rpm = Math.max(0, this.rpm + deltaRpm);
    } else {
      this.rpm = Math.max(0, this.rpm - deltaRpm);
    }
    this._checkSleep();
  }

  /**
   * Depletes RPM by a specified amount.
   * @param {number} amount
   */
  applySpinLoss(amount) {
    if (!this.isAlive) return;
    this.rpm = Math.max(0, this.rpm - Math.max(0, amount));
    this._checkSleep();
  }

  /**
   * Checks if top has destabilized and stopped spinning.
   * @private
   */
  _checkSleep() {
    if (this.isAlive && this.rpm <= TOP_DEFAULTS.MIN_ACTIVE_RPM) {
      this.isSleeping = true;
      this.isAlive = false;
      this.rpm = 0;
      this.eliminationTime = performance.now ? performance.now() : Date.now();
      this.eliminationReason = 'SLEEP';
    }
  }

  /**
   * Clamps linear speed to prevent unrealistic physics interactions or tunneling.
   * @private
   */
  _clampVelocity() {
    const speed = this.velocity.length();
    if (speed > PHYSICS_LIMITS.MAX_LINEAR_SPEED) {
      this.velocity.scale(PHYSICS_LIMITS.MAX_LINEAR_SPEED / speed);
    }
  }

  /**
   * Suffers damage to burst resistance from an impact impulse.
   * Mitigation scales with defense rating.
   * @param {number} impactMagnitude
   * @param {number} [attackerAttackPower=50]
   * @returns {boolean} True if burst occurred
   */
  takeDamage(impactMagnitude, attackerAttackPower = 50) {
    if (!this.isAlive) return false;

    // Defense mitigates raw impact damage
    const defenseMitigation = 1 + this.defensePower / 55;
    const attackMultiplier = 1 + attackerAttackPower / 75;
    const damage = (impactMagnitude * 0.14 * attackMultiplier) / defenseMitigation;

    this.burstResistance = Math.max(0, this.burstResistance - damage);
    this.maxImpactTaken = Math.max(this.maxImpactTaken, impactMagnitude);
    this.triggerImpactFlash(0.18);

    if (this.burstResistance <= 0) {
      this.isBurst = true;
      this.isAlive = false;
      this.rpm = 0;
      this.eliminationTime = performance.now ? performance.now() : Date.now();
      this.eliminationReason = 'BURST';
      return true;
    }
    return false;
  }

  /**
   * Triggers visual impact flash feedback.
   * @param {number} [duration]
   */
  triggerImpactFlash(duration = 0.18) {
    this.impactFlashTimer = Math.max(this.impactFlashTimer, duration);
  }

  /**
   * Fixed physics tick update.
   * Integrates slope gravity, tip friction, aerodynamic drag, and precession scrape.
   * @param {number} dt Delta time in seconds
   * @param {import('./Arena.js').Arena} arena
   */
  update(dt, arena) {
    if (this.impactFlashTimer > 0) {
      this.impactFlashTimer = Math.max(0, this.impactFlashTimer - dt);
    }

    this.previousPosition.copy(this.position);
    this.previousRotationAngle = this.rotationAngle;

    if (!this.isAlive) {
      // Rapid rundown if dead
      this.rpm = Math.max(0, this.rpm - dt * 3000);
      this.velocity.scale(0.88);
      this.position.add(this.velocity.clone().scale(dt));
      return;
    }

    this.spinTime += dt;

    // 1. Inward parabolic dish slope force
    if (arena) {
      const slopeForce = arena.getSlopeForceAt(this.position);
      // Tops with lower mass are drawn down the slope faster; defensive tops resist drift
      this.applyForce(slopeForce.scale(dt));
    }

    // 2. Linear motion integration & surface friction
    this.position.add(this.velocity.clone().scale(dt));

    const arenaFriction = arena ? arena.surfaceFriction : 0.12;
    // Driver grip modifies surface deceleration
    const effectiveFriction = arenaFriction * (0.6 + this.grip * 0.8);
    const linearDamping = Math.max(0, 1 - effectiveFriction * dt * 2.8);
    this.velocity.scale(linearDamping);
    this._clampVelocity();

    // 3. Realistic Stamina Decay Modeling:
    // a) Aerodynamic drag: proportional to current RPM
    const airDrag = this.rpm * TOP_DEFAULTS.AIR_DRAG_COEFF;

    // b) Tip floor friction drag: scales with movement speed and stamina rating
    const staminaEfficiency = 120 / (60 + this.staminaRating);
    const speedFactor = 1 + (this.velocity.length() / 250) * TOP_DEFAULTS.SURFACE_SPEED_DRAG * 50;
    const baseTipDrag = TOP_DEFAULTS.BASE_SPIN_DECAY * staminaEfficiency * (0.7 + this.grip * 0.6) * speedFactor;

    // c) Precession Scrape Drag: As wobble increases, edge scrapes the bowl accelerating spin death
    const scrapeDrag = this.wobbleMagnitude > 0.15
      ? Math.pow(this.wobbleMagnitude, 2) * TOP_DEFAULTS.BASE_SPIN_DECAY * TOP_DEFAULTS.SCRAPE_DRAG_MULTIPLIER
      : 0;

    const totalSpinDecay = (airDrag + baseTipDrag + scrapeDrag) * dt;
    this.applySpinLoss(totalSpinDecay);

    // 4. Update visual rotation angle
    const radPerSec = this.getAngularVelocity();
    this.rotationAngle += radPerSec * dt;

    // 5. Precession wobble dynamics:
    // When RPM drops below threshold, gyroscopic stability is lost
    if (this.rpm < TOP_DEFAULTS.WOBBLE_THRESHOLD_RPM && this.rpm > 0) {
      const wobbleProgress = 1 - this.rpm / TOP_DEFAULTS.WOBBLE_THRESHOLD_RPM;
      this.wobbleMagnitude = Math.min(1.0, wobbleProgress * 1.5);
      this.wobbleAngle += (this.wobbleSpeed + wobbleProgress * 14) * dt;
    } else {
      this.wobbleMagnitude = Math.max(0, this.wobbleMagnitude - dt * 2.5);
    }
  }

  /**
   * Reset top state.
   */
  reset() {
    this.position.set(0, 0);
    this.previousPosition.set(0, 0);
    this.velocity.set(0, 0);
    this.rpm = this.maxRpm;
    this.rotationAngle = 0;
    this.previousRotationAngle = 0;
    this.impactFlashTimer = 0;
    this.wobbleMagnitude = 0;
    this.wobbleAngle = 0;
    this.burstResistance = this.maxBurstResistance;
    this.isAlive = true;
    this.isBurst = false;
    this.isRingOut = false;
    this.isSleeping = false;
    this.eliminationTime = null;
    this.eliminationReason = null;
    this.spinTime = 0;
  }
}
