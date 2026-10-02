/**
 * SPINFORGE - 2D Vector Utility
 * Core mathematical primitive for physics, positioning, and collisions.
 */

export class Vector2 {
  /**
   * @param {number} x
   * @param {number} y
   */
  constructor(x = 0, y = 0) {
    this.x = Number.isFinite(x) ? x : 0;
    this.y = Number.isFinite(y) ? y : 0;
  }

  /**
   * Creates a new Vector2 instance.
   * @param {number} x
   * @param {number} y
   * @returns {Vector2}
   */
  static create(x = 0, y = 0) {
    return new Vector2(x, y);
  }

  /**
   * Creates a vector from polar coordinates (angle in radians, length).
   * @param {number} angle
   * @param {number} length
   * @returns {Vector2}
   */
  static fromPolar(angle, length = 1) {
    return new Vector2(Math.cos(angle) * length, Math.sin(angle) * length);
  }

  /**
   * Clone vector.
   * @returns {Vector2}
   */
  clone() {
    return new Vector2(this.x, this.y);
  }

  /**
   * Set x and y.
   * @param {number} x
   * @param {number} y
   * @returns {this}
   */
  set(x, y) {
    this.x = x;
    this.y = y;
    return this;
  }

  /**
   * Copy from another vector.
   * @param {Vector2} v
   * @returns {this}
   */
  copy(v) {
    this.x = v.x;
    this.y = v.y;
    return this;
  }

  /**
   * Add another vector in-place.
   * @param {Vector2} v
   * @returns {this}
   */
  add(v) {
    this.x += v.x;
    this.y += v.y;
    return this;
  }

  /**
   * Add scalar to both components.
   * @param {number} s
   * @returns {this}
   */
  addScalar(s) {
    this.x += s;
    this.y += s;
    return this;
  }

  /**
   * Subtract another vector in-place.
   * @param {Vector2} v
   * @returns {this}
   */
  sub(v) {
    this.x -= v.x;
    this.y -= v.y;
    return this;
  }

  /**
   * Multiply by scalar.
   * @param {number} s
   * @returns {this}
   */
  scale(s) {
    this.x *= s;
    this.y *= s;
    return this;
  }

  /**
   * Divide by scalar.
   * @param {number} s
   * @returns {this}
   */
  divide(s) {
    if (s !== 0) {
      this.x /= s;
      this.y /= s;
    }
    return this;
  }

  /**
   * Dot product with another vector.
   * @param {Vector2} v
   * @returns {number}
   */
  dot(v) {
    return this.x * v.x + this.y * v.y;
  }

  /**
   * 2D Cross product analog (determinant).
   * @param {Vector2} v
   * @returns {number}
   */
  cross(v) {
    return this.x * v.y - this.y * v.x;
  }

  /**
   * Magnitude (length) of the vector.
   * @returns {number}
   */
  length() {
    return Math.hypot(this.x, this.y);
  }

  /**
   * Squared magnitude.
   * @returns {number}
   */
  lengthSquared() {
    return this.x * this.x + this.y * this.y;
  }

  /**
   * Distance to another vector.
   * @param {Vector2} v
   * @returns {number}
   */
  distanceTo(v) {
    return Math.hypot(this.x - v.x, this.y - v.y);
  }

  /**
   * Distance squared to another vector.
   * @param {Vector2} v
   * @returns {number}
   */
  distanceSquaredTo(v) {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    return dx * dx + dy * dy;
  }

  /**
   * Normalize vector to unit length.
   * @returns {this}
   */
  normalize() {
    const len = this.length();
    if (len > 0.00001) {
      this.scale(1 / len);
    } else {
      this.set(0, 0);
    }
    return this;
  }

  /**
   * Angle in radians relative to positive X axis.
   * @returns {number}
   */
  angle() {
    return Math.atan2(this.y, this.x);
  }

  /**
   * Rotate vector by angle in radians.
   * @param {number} radians
   * @returns {this}
   */
  rotate(radians) {
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const nx = this.x * cos - this.y * sin;
    const ny = this.x * sin + this.y * cos;
    this.x = nx;
    this.y = ny;
    return this;
  }

  /**
   * Reflect vector across a normal unit vector.
   * @param {Vector2} normal
   * @returns {this}
   */
  reflect(normal) {
    const d = 2 * this.dot(normal);
    this.x -= d * normal.x;
    this.y -= d * normal.y;
    return this;
  }

  /**
   * Linearly interpolate towards target vector.
   * @param {Vector2} target
   * @param {number} t
   * @returns {this}
   */
  lerp(target, t) {
    this.x += (target.x - this.x) * t;
    this.y += (target.y - this.y) * t;
    return this;
  }

  /**
   * Returns formatted string representation.
   * @returns {string}
   */
  toString() {
    return `Vector2(${this.x.toFixed(2)}, ${this.y.toFixed(2)})`;
  }
}

