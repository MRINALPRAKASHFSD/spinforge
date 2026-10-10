/**
 * SPINFORGE - PhysicsWorld
 * Comprehensive 2D physics simulation managing rigid-body collisions,
 * angular momentum clashing, stamina dynamics, boundary interactions, and event notifications.
 */

import { Vector2 } from './Vector2.js';
import { Arena } from './Arena.js';
import { TOP_DEFAULTS, FINISH_TYPES, PHYSICS_LIMITS, PHYSICS_SUBSTEPS } from './constants.js';

export class PhysicsWorld {
  /**
   * @param {Arena} [arena]
   * @param {Object} [options]
   * @param {number} [options.substeps=2]
   */
  constructor(arena = new Arena(), options = {}) {
    this.arena = arena;
    this.substeps = options.substeps || PHYSICS_SUBSTEPS;

    /** @type {import('./SpinningTop.js').SpinningTop[]} */
    this.tops = [];

    /** @type {Set<(event: { type: string, [key: string]: any }) => void>} */
    this.eventListeners = new Set();
  }

  /**
   * Adds a top to the simulation.
   * @param {import('./SpinningTop.js').SpinningTop} top
   */
  addTop(top) {
    if (!this.tops.includes(top)) {
      this.tops.push(top);
    }
  }

  /**
   * Removes a top from the simulation.
   * @param {import('./SpinningTop.js').SpinningTop} top
   */
  removeTop(top) {
    const idx = this.tops.indexOf(top);
    if (idx !== -1) {
      this.tops.splice(idx, 1);
    }
  }

  /**
   * Clears all tops.
   */
  clear() {
    this.tops = [];
  }

  /**
   * Subscribe to physics events (collisions, knockouts, bursts).
   * @param {(event: { type: string, [key: string]: any }) => void} listener
   * @returns {() => void} Unsubscribe function
   */
  onEvent(listener) {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  /**
   * Dispatches an event to all subscribers.
   * @param {{ type: string, [key: string]: any }} event
   * @private
   */
  _emit(event) {
    for (const listener of this.eventListeners) {
      try {
        listener(event);
      } catch (err) {
        console.error('Error in physics event listener:', err);
      }
    }
  }

  /**
   * Advance physical simulation by delta time dt with fixed sub-stepping.
   * Sub-stepping prevents tunneling at high velocities and ensures momentum stability.
   * @param {number} dt Delta time in seconds
   */
  step(dt) {
    if (dt <= 0) return;

    const subDt = dt / this.substeps;
    for (let s = 0; s < this.substeps; s++) {
      this._subStep(subDt);
    }
  }

  /**
   * Single sub-step of physical integration and collision resolution.
   * @param {number} dt Delta time for this substep
   * @private
   */
  _subStep(dt) {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();

    // 1. Update individual top kinematics, dish slope force, and stamina decay
    for (const top of this.tops) {
      top.update(dt, this.arena);

      if (!top.isAlive) continue;

      // Check knockout pocket entrapment (Over Finish)
      const pocketCheck = this.arena.checkPocket(top.position, top.radius);
      if (pocketCheck.inPocket) {
        top.isAlive = false;
        top.isRingOut = true;
        top.eliminationTime = now;
        top.eliminationReason = 'OVER_FINISH';

        this._emit({
          type: 'pocket_finish',
          finishType: FINISH_TYPES.OVER_FINISH,
          top,
          pocket: pocketCheck.pocket,
        });
        continue;
      }

      // Check over-the-rim Ring Out
      if (this.arena.isOverRim(top.position, top.velocity)) {
        top.isAlive = false;
        top.isRingOut = true;
        top.eliminationTime = now;
        top.eliminationReason = 'RING_OUT';

        this._emit({
          type: 'ring_out',
          finishType: FINISH_TYPES.RING_OUT,
          top,
          position: top.position.clone(),
        });
        continue;
      }

      // Check arena outer rim rebound collision
      const wallRes = this.arena.resolveWallCollision(top);
      if (wallRes.collided && wallRes.impactSpeed > 20) {
        this._emit({
          type: 'wall_hit',
          top,
          normal: wallRes.normal,
          impactSpeed: wallRes.impactSpeed,
        });
      }
    }

    // 2. Pairwise top-to-top collision detection and momentum resolution
    const len = this.tops.length;
    for (let i = 0; i < len; i++) {
      for (let j = i + 1; j < len; j++) {
        const a = this.tops[i];
        const b = this.tops[j];
        if (a.isAlive && b.isAlive) {
          this._resolveTopCollision(a, b);
        }
      }
    }
  }

  /**
   * Resolves collision between two tops including:
   * - Mass-weighted position projection (overlap resolution)
   * - Normal impulse with attribute-adjusted restitution
   * - Tangential surface friction & angular spin clash
   * - Burst durability damage with defense mitigation
   *
   * @param {import('./SpinningTop.js').SpinningTop} a
   * @param {import('./SpinningTop.js').SpinningTop} b
   * @private
   */
  _resolveTopCollision(a, b) {
    const delta = b.position.clone().sub(a.position);
    const dist = delta.length();
    const minDist = a.radius + b.radius;

    if (dist >= minDist || dist < PHYSICS_LIMITS.MIN_SEPARATION_DIST) return;

    // Normal unit vector pointing from a to b
    const normal = delta.clone().scale(1 / dist);
    // Tangent unit vector perpendicular to normal
    const tangent = new Vector2(-normal.y, normal.x);

    // 1. Position Projection (overlap resolution weighted inversely by mass)
    const overlap = minDist - dist;
    const invMassA = 1 / a.mass;
    const invMassB = 1 / b.mass;
    const totalInvMass = invMassA + invMassB;

    a.position.sub(normal.clone().scale(overlap * (invMassA / totalInvMass)));
    b.position.add(normal.clone().scale(overlap * (invMassB / totalInvMass)));

    // 2. Linear relative velocity along normal
    const relativeVel = b.velocity.clone().sub(a.velocity);
    const velAlongNormal = relativeVel.dot(normal);

    // If moving apart, do not apply repulsive impulse
    if (velAlongNormal > 0) return;

    // Attribute-weighted restitution: Attack tops bite harder, Defense tops cushion
    const attackBonus = (a.attackPower + b.attackPower) / 500;
    const defenseCushion = (a.defensePower + b.defensePower) / 600;
    const effectiveRestitution = Math.min(0.88, Math.max(0.55, TOP_DEFAULTS.COLLISION_ELASTICITY + attackBonus - defenseCushion));

    // Normal impulse magnitude (Newtonian collision)
    const impulseMag = (-(1 + effectiveRestitution) * velAlongNormal) / totalInvMass;
    const normalImpulse = normal.clone().scale(impulseMag);

    // Apply linear impulse
    a.velocity.sub(normalImpulse.clone().multiplyScalar ? normalImpulse.clone().scale(invMassA) : normalImpulse.clone().scale(invMassA));
    b.velocity.add(normalImpulse.clone().scale(invMassB));

    // 3. Angular Spin Clash & Tangential Friction
    // Surface velocities at contact point:
    // v_surf = v_lin + omega x r
    const omegaA = a.getAngularVelocity();
    const omegaB = b.getAngularVelocity();
    const surfSpeedA = omegaA * a.radius;
    const surfSpeedB = omegaB * b.radius;

    // Relative slip along contact tangent
    const linTangentVel = relativeVel.dot(tangent);
    const slipVel = linTangentVel - (surfSpeedA + surfSpeedB);

    // Tangential impulse to model blade friction / grind
    const invInertiaA = Math.pow(a.radius, 2) / a.momentOfInertia;
    const invInertiaB = Math.pow(b.radius, 2) / b.momentOfInertia;
    const effTangentialMass = 1 / (totalInvMass + invInertiaA + invInertiaB);

    let tangentialImpulseMag = -slipVel * effTangentialMass * TOP_DEFAULTS.SPIN_CLASH_COEFFICIENT;
    // Coulomb friction limit: |J_t| <= mu * J_n
    const frictionLimit = impulseMag * 0.45;
    tangentialImpulseMag = Math.max(-frictionLimit, Math.min(frictionLimit, tangentialImpulseMag));

    const tangentialImpulse = tangent.clone().scale(tangentialImpulseMag);

    // Apply tangential impulse to linear velocities
    a.velocity.sub(tangentialImpulse.clone().scale(invMassA));
    b.velocity.add(tangentialImpulse.clone().scale(invMassB));

    // Apply torque impulse to rotational velocities
    const torqueA = -tangentialImpulseMag * a.radius;
    const torqueB = -tangentialImpulseMag * b.radius;
    a.applyTorqueImpulse(torqueA);
    b.applyTorqueImpulse(torqueB);

    // Additional blade clash spin loss: High-speed mutual friction
    const spinDiff = Math.abs(a.rpm * a.spinDirection - b.rpm * b.spinDirection);
    const clashIntensity = Math.min(1.0, spinDiff / 9000);
    const spinLossA = (impulseMag * 0.35 + clashIntensity * 90) * (1 + b.attackPower / 75);
    const spinLossB = (impulseMag * 0.35 + clashIntensity * 90) * (1 + a.attackPower / 75);

    a.applySpinLoss(spinLossA);
    b.applySpinLoss(spinLossB);

    // 4. Burst Durability Damage
    const burstA = a.takeDamage(impulseMag, b.attackPower);
    const burstB = b.takeDamage(impulseMag, a.attackPower);

    // 5. Update match telemetry
    a.collisionsCount++;
    b.collisionsCount++;
    a.maxImpactDealt = Math.max(a.maxImpactDealt, impulseMag);
    b.maxImpactDealt = Math.max(b.maxImpactDealt, impulseMag);

    const contactPoint = a.position.clone().add(normal.clone().scale(a.radius));
    const isHardImpact = impulseMag > 110;

    // 6. Emit collision event
    this._emit({
      type: 'top_collision',
      topA: a,
      topB: b,
      contactPoint,
      normal,
      impulse: impulseMag,
      isHardImpact,
      damageA: impulseMag * 0.14,
      damageB: impulseMag * 0.14,
    });

    if (burstA) {
      this._emit({
        type: 'burst_finish',
        finishType: FINISH_TYPES.BURST_FINISH,
        victim: a,
        winner: b,
        impulse: impulseMag,
      });
    }

    if (burstB) {
      this._emit({
        type: 'burst_finish',
        finishType: FINISH_TYPES.BURST_FINISH,
        victim: b,
        winner: a,
        impulse: impulseMag,
      });
    }
  }
}
