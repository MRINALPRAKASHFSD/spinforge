/**
 * SPINFORGE - Arena
 * Manages the stadium bowl physics geometry, knockout pockets, slope forces,
 * wall bounce reactions, and out-of-bounds ring-out detection.
 */

import { Vector2 } from './Vector2.js';
import { ARENA_DEFAULTS } from './constants.js';

export class Arena {
  /**
   * @param {Partial<typeof ARENA_DEFAULTS>} [options]
   */
  constructor(options = {}) {
    this.radius = options.RADIUS ?? ARENA_DEFAULTS.RADIUS;
    this.center = new Vector2(
      options.CENTER_X ?? ARENA_DEFAULTS.CENTER_X,
      options.CENTER_Y ?? ARENA_DEFAULTS.CENTER_Y
    );
    this.depthSlope = options.DEPTH_SLOPE ?? ARENA_DEFAULTS.DEPTH_SLOPE;
    this.wallRestitution = options.WALL_RESTITUTION ?? ARENA_DEFAULTS.WALL_RESTITUTION;
    this.wallFriction = options.WALL_FRICTION ?? ARENA_DEFAULTS.WALL_FRICTION;
    this.surfaceFriction = options.SURFACE_FRICTION ?? ARENA_DEFAULTS.SURFACE_FRICTION;
    this.pocketRadius = options.POCKET_RADIUS ?? ARENA_DEFAULTS.POCKET_RADIUS;
    this.outOfBoundsMargin = options.OUT_OF_BOUNDS_MARGIN ?? ARENA_DEFAULTS.OUT_OF_BOUNDS_MARGIN;

    /** @type {Array<{ position: Vector2, radius: number, id: number }>} */
    this.pockets = [];
    this._initializePockets(options.POCKET_COUNT ?? ARENA_DEFAULTS.POCKET_COUNT);
  }

  /**
   * Generates equidistant knockout pockets along the stadium perimeter.
   * @param {number} count
   * @private
   */
  _initializePockets(count) {
    this.pockets = [];
    if (count <= 0) return;

    const pocketDist = this.radius * ARENA_DEFAULTS.POCKET_OFFSET_RATIO;
    const step = (Math.PI * 2) / count;

    for (let i = 0; i < count; i++) {
      const angle = i * step + Math.PI / 4; // 45 degree tilt
      const pos = new Vector2(
        this.center.x + Math.cos(angle) * pocketDist,
        this.center.y + Math.sin(angle) * pocketDist
      );
      this.pockets.push({
        id: i,
        position: pos,
        radius: this.pocketRadius,
      });
    }
  }

  /**
   * Calculates the slope force vector directed toward arena center at given position.
   * Parabolic bowl profile: steeper inward acceleration the further a top drifts toward the rim.
   * @param {Vector2} position
   * @returns {Vector2}
   */
  getSlopeForceAt(position) {
    const toCenter = this.center.clone().sub(position);
    const dist = toCenter.length();

    if (dist < 0.001) return new Vector2(0, 0);

    toCenter.normalize();
    const normalizedDist = Math.min(dist / this.radius, 1.3);
    const forceMagnitude = this.depthSlope * Math.pow(normalizedDist, 1.25);

    return toCenter.scale(forceMagnitude);
  }

  /**
   * Checks if position is within any knockout pocket.
   * @param {Vector2} position
   * @param {number} [topRadius=0]
   * @returns {{ inPocket: boolean, pocket: { position: Vector2, radius: number, id: number } | null }}
   */
  checkPocket(position, topRadius = 0) {
    for (const pocket of this.pockets) {
      const dist = position.distanceTo(pocket.position);
      if (dist < pocket.radius + topRadius * 0.3) {
        return { inPocket: true, pocket };
      }
    }
    return { inPocket: false, pocket: null };
  }

  /**
   * Checks if position is within any knockout pocket (boolean helper).
   * @param {Vector2} position
   * @param {number} [topRadius=0]
   * @returns {boolean}
   */
  isInPocket(position, topRadius = 0) {
    return this.checkPocket(position, topRadius).inPocket;
  }

  /**
   * Checks if a top has breached the outer rim boundary and been knocked out of the stadium.
   * @param {Vector2} position
   * @param {Vector2} [velocity]
   * @returns {boolean}
   */
  isOverRim(position, velocity) {
    const dist = position.distanceTo(this.center);
    if (dist > this.radius + this.outOfBoundsMargin) {
      return true;
    }
    // High outward speed past the rim crest
    if (velocity && dist > this.radius + 5) {
      const outwardVel = velocity.dot(position.clone().sub(this.center).normalize());
      if (outwardVel > 120) {
        return true;
      }
    }
    return false;
  }

  /**
   * Checks if position is beyond stadium boundary rim.
   * @param {Vector2} position
   * @param {number} [margin=20]
   * @returns {boolean}
   */
  isOutOfBounds(position, margin = this.outOfBoundsMargin) {
    return position.distanceTo(this.center) > this.radius + margin;
  }

  /**
   * Handles collision of a top against the outer arena rim.
   * @param {import('./SpinningTop.js').SpinningTop} top
   * @returns {{ collided: boolean, normal: Vector2, impactSpeed: number }}
   */
  resolveWallCollision(top) {
    const toCenter = top.position.clone().sub(this.center);
    const dist = toCenter.length();
    const maxAllowedDist = this.radius - top.radius;

    if (dist <= maxAllowedDist) {
      return { collided: false, normal: new Vector2(0, 0), impactSpeed: 0 };
    }

    // Normal pointing inward towards center
    const normal = toCenter.clone().normalize().scale(-1);

    // Reposition top right onto boundary
    top.position.x = this.center.x - normal.x * maxAllowedDist;
    top.position.y = this.center.y - normal.y * maxAllowedDist;

    // Reflect velocity along normal
    const normalVel = top.velocity.dot(normal);
    let impactSpeed = 0;

    if (normalVel < 0) {
      impactSpeed = Math.abs(normalVel);
      // Impulse with wall bounce restitution
      top.velocity.sub(normal.clone().scale((1 + this.wallRestitution) * normalVel));
      // Wall surface friction dampens tangential velocity
      top.velocity.scale(this.wallFriction);

      // Wall grind causes RPM loss proportional to impact and spin
      top.applySpinLoss(impactSpeed * 0.75 + 15);
    }

    return { collided: true, normal, impactSpeed };
  }
}
