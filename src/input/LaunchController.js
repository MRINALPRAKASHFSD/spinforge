/**
 * SPINFORGE - LaunchController
 * Manages the interactive rip-cord launch system: aiming angle, timing power gauge, and release kinematics.
 */

import { Vector2 } from '../engine/Vector2.js';

export const LAUNCH_STATES = {
  READY: 'READY',
  CHARGING: 'CHARGING',
  LAUNCHED: 'LAUNCHED',
};

export class LaunchController {
  /**
   * @param {Object} [config]
   * @param {number} [config.stadiumRadius]
   * @param {number} [config.chargeSpeed]
   */
  constructor(config = {}) {
    this.stadiumRadius = config.stadiumRadius || 260;
    this.chargeSpeed = config.chargeSpeed || 2.4; // full cycle per second

    this.state = LAUNCH_STATES.READY;
    this.angle = -Math.PI / 2; // Default launch direction (pointing toward center from rim)
    this.power = 0; // 0.0 to 1.0
    this.powerDirection = 1; // 1 = rising, -1 = falling

    // Launch spawn coordinates (rim entry position)
    this.spawnPosition = new Vector2(0, -this.stadiumRadius * 0.7);

    /** @type {Set<(launchData: { position: Vector2, velocity: Vector2, rpm: number, power: number }) => void>} */
    this.launchListeners = new Set();
  }

  /**
   * Set aim direction angle in radians.
   * @param {number} angle
   */
  setAimAngle(angle) {
    if (this.state === LAUNCH_STATES.LAUNCHED) return;
    this.angle = angle;
  }

  /**
   * Set spawn position.
   * @param {number} x
   * @param {number} y
   */
  setSpawnPosition(x, y) {
    this.spawnPosition.set(x, y);
  }

  /**
   * Starts charging the rip-cord gauge.
   */
  startCharging() {
    if (this.state === LAUNCH_STATES.READY) {
      this.state = LAUNCH_STATES.CHARGING;
      this.power = 0;
      this.powerDirection = 1;
    }
  }

  /**
   * Update the oscillating power gauge.
   * @param {number} dt Delta time in seconds
   */
  update(dt) {
    if (this.state !== LAUNCH_STATES.CHARGING) return;

    this.power += this.powerDirection * this.chargeSpeed * dt;

    if (this.power >= 1.0) {
      this.power = 1.0;
      this.powerDirection = -1;
    } else if (this.power <= 0.0) {
      this.power = 0.0;
      this.powerDirection = 1;
    }
  }

  /**
   * Triggers the rip-cord release at current power and angle.
   * Calculates launch velocity and initial RPM.
   * @returns {{ position: Vector2, velocity: Vector2, rpm: number, power: number } | null}
   */
  release() {
    if (this.state === LAUNCH_STATES.LAUNCHED) return null;

    // Minimum 30% baseline power even on early release
    const effectivePower = Math.max(0.3, this.power);

    // Launch velocity pushes inward at angle with tangential spin bias
    const launchSpeed = 160 + effectivePower * 340;
    const velocity = Vector2.fromPolar(this.angle, launchSpeed);

    // Rip-cord power maps to 5,500 - 9,500 RPM
    const launchRpm = Math.floor(5500 + effectivePower * 4000);

    const launchData = {
      position: this.spawnPosition.clone(),
      velocity,
      rpm: launchRpm,
      power: effectivePower,
    };

    this.state = LAUNCH_STATES.LAUNCHED;

    for (const listener of this.launchListeners) {
      listener(launchData);
    }

    return launchData;
  }

  /**
   * Reset launcher for next round.
   */
  reset() {
    this.state = LAUNCH_STATES.READY;
    this.power = 0;
    this.powerDirection = 1;
  }

  /**
   * Listen to launch releases.
   * @param {(data: { position: Vector2, velocity: Vector2, rpm: number, power: number }) => void} listener
   * @returns {() => void}
   */
  onLaunch(listener) {
    this.launchListeners.add(listener);
    return () => this.launchListeners.delete(listener);
  }
}

