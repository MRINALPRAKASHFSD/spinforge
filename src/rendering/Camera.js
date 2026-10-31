/**
 * SPINFORGE - Camera
 * 2D Camera manager bridging Arena world coordinates and Canvas screen coordinates.
 * Supports auto-framing zoom, coordinate transformations, responsive scaling, and damped screen shake.
 */

import { Vector2 } from '../engine/Vector2.js';

export class Camera {
  /**
   * @param {Object} [config]
   * @param {number} [config.viewportWidth]
   * @param {number} [config.viewportHeight]
   * @param {number} [config.dpr]
   * @param {number} [config.arenaRadius]
   */
  constructor(config = {}) {
    this.viewportWidth = config.viewportWidth || 800;
    this.viewportHeight = config.viewportHeight || 600;
    this.dpr = config.dpr || 1;
    this.arenaRadius = config.arenaRadius || 300;

    // Camera target focus in arena space (center of arena bowl is (0, 0))
    this.center = new Vector2(0, 0);
    this.targetCenter = new Vector2(0, 0);

    // Zoom scale factor
    this.zoom = 1.0;
    this.baseZoom = 1.0;

    // Screen shake state
    this.shakeOffset = new Vector2(0, 0);
    this.shakeIntensity = 0;
    this.shakeDuration = 0;
    this.shakeElapsed = 0;

    this.recalculateZoom();
  }

  /**
   * Updates viewport metrics and recalculates framing zoom.
   * @param {number} width CSS width in pixels
   * @param {number} height CSS height in pixels
   * @param {number} [dpr] Device pixel ratio
   */
  resize(width, height, dpr = this.dpr) {
    this.viewportWidth = Math.max(10, width);
    this.viewportHeight = Math.max(10, height);
    this.dpr = dpr;
    this.recalculateZoom();
  }

  /**
   * Automatically calculates zoom scale so the arena bowl fills the viewport nicely.
   * On mobile portrait, fits the diameter comfortably inside the screen width with margin.
   * @param {number} [marginRatio] Default 1.2 provides a 20% visual breathing margin
   */
  recalculateZoom(marginRatio = 1.25) {
    const minDimension = Math.min(this.viewportWidth, this.viewportHeight);
    const arenaDiameter = this.arenaRadius * 2 * marginRatio;
    this.baseZoom = Math.min(1.4, Math.max(0.4, minDimension / arenaDiameter));
    this.zoom = this.baseZoom;
  }

  /**
   * Triggers screen shake with given intensity and duration.
   * @param {number} intensity Max displacement in pixels
   * @param {number} duration Duration in seconds
   */
  triggerShake(intensity = 8, duration = 0.25) {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    this.shakeDuration = Math.max(this.shakeDuration, duration);
    this.shakeElapsed = 0;
  }

  /**
   * Smoothly follow the midpoint between two fighting tops.
   * @param {Vector2} posA
   * @param {Vector2} posB
   * @param {number} maxOffset Max distance camera can drift from center
   * @param {number} smoothing Lerp factor
   */
  trackMidpoint(posA, posB, maxOffset = 60, smoothing = 0.08) {
    if (!posA || !posB) return;
    const midX = (posA.x + posB.x) * 0.5;
    const midY = (posA.y + posB.y) * 0.5;

    // Clamp offset from arena center to keep arena in view
    const dist = Math.hypot(midX, midY);
    if (dist > maxOffset) {
      const scale = maxOffset / dist;
      this.targetCenter.set(midX * scale, midY * scale);
    } else {
      this.targetCenter.set(midX, midY);
    }

    this.center.lerp(this.targetCenter, smoothing);
  }

  /**
   * Update screen shake and smooth movements.
   * @param {number} dt Delta time in seconds
   */
  update(dt) {
    if (this.shakeDuration > 0) {
      this.shakeElapsed += dt;
      const progress = this.shakeElapsed / this.shakeDuration;

      if (progress >= 1.0) {
        this.shakeIntensity = 0;
        this.shakeDuration = 0;
        this.shakeOffset.set(0, 0);
      } else {
        // Exponential damping
        const currentStrength = this.shakeIntensity * (1 - progress);
        const angle = Math.random() * Math.PI * 2;
        this.shakeOffset.set(
          Math.cos(angle) * currentStrength,
          Math.sin(angle) * currentStrength
        );
      }
    } else {
      this.shakeOffset.set(0, 0);
    }
  }

  /**
   * Transforms the 2D canvas context to camera/arena coordinate space.
   * @param {CanvasRenderingContext2D} ctx
   */
  apply(ctx) {
    ctx.save();

    // 1. Scale for High-DPI
    ctx.scale(this.dpr, this.dpr);

    // 2. Translate origin to screen center
    const screenCenterX = this.viewportWidth * 0.5;
    const screenCenterY = this.viewportHeight * 0.5;

    ctx.translate(
      screenCenterX + this.shakeOffset.x,
      screenCenterY + this.shakeOffset.y
    );

    // 3. Apply arena zoom
    ctx.scale(this.zoom, this.zoom);

    // 4. Translate by camera center in arena space
    ctx.translate(-this.center.x, -this.center.y);
  }

  /**
   * Restores the 2D canvas context after rendering arena world.
   * @param {CanvasRenderingContext2D} ctx
   */
  restore(ctx) {
    ctx.restore();
  }

  /**
   * Converts world/arena coordinate (x, y) to screen CSS pixel coordinate.
   * @param {Vector2 | { x: number, y: number }} worldPoint
   * @returns {Vector2} Screen CSS pixel coordinate
   */
  worldToScreen(worldPoint) {
    const screenCenterX = this.viewportWidth * 0.5;
    const screenCenterY = this.viewportHeight * 0.5;

    const screenX = screenCenterX + this.shakeOffset.x + (worldPoint.x - this.center.x) * this.zoom;
    const screenY = screenCenterY + this.shakeOffset.y + (worldPoint.y - this.center.y) * this.zoom;

    return new Vector2(screenX, screenY);
  }

  /**
   * Converts screen CSS pixel coordinate (e.g. mouse or touch event) into world/arena space.
   * @param {number} screenX
   * @param {number} screenY
   * @returns {Vector2} Arena coordinate where center of bowl is (0, 0)
   */
  screenToWorld(screenX, screenY) {
    const screenCenterX = this.viewportWidth * 0.5;
    const screenCenterY = this.viewportHeight * 0.5;

    const relX = screenX - (screenCenterX + this.shakeOffset.x);
    const relY = screenY - (screenCenterY + this.shakeOffset.y);

    const worldX = relX / this.zoom + this.center.x;
    const worldY = relY / this.zoom + this.center.y;

    return new Vector2(worldX, worldY);
  }
}

