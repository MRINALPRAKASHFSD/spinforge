/**
 * SPINFORGE - GameLoop
 * High-precision game loop with fixed-timestep physics accumulation and variable render interpolation.
 */

import { FIXED_TIMESTEP } from './constants.js';

export class GameLoop {
  /**
   * @param {Object} [config]
   * @param {(dt: number) => void} [config.update] Fixed physics update callback
   * @param {(alpha: number, dt: number) => void} [config.render] Variable frame render callback
   * @param {number} [config.fixedTimestep]
   */
  constructor(config = {}) {
    this.updateFn = config.update || (() => {});
    this.renderFn = config.render || (() => {});
    this.fixedTimestep = config.fixedTimestep || FIXED_TIMESTEP;

    this.isRunning = false;
    this.isPaused = false;
    this.timeScale = 1.0;

    this.lastTime = 0;
    this.accumulator = 0;
    this.animationFrameId = null;

    // Performance telemetry
    this.fps = 60;
    this.frameCount = 0;
    this.fpsTimer = 0;

    this._loop = this._loop.bind(this);
  }

  /**
   * Start the game loop.
   */
  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.isPaused = false;
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.animationFrameId = requestAnimationFrame(this._loop);
  }

  /**
   * Stop the game loop completely.
   */
  stop() {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Pause execution of updates while allowing rendering to continue.
   */
  pause() {
    this.isPaused = true;
  }

  /**
   * Resume normal execution.
   */
  resume() {
    this.isPaused = false;
    this.lastTime = performance.now();
  }

  /**
   * Performs a single fixed-step advance for debugging.
   */
  stepOnce() {
    this.updateFn(this.fixedTimestep);
    this.renderFn(1.0, this.fixedTimestep);
  }

  /**
   * Core requestAnimationFrame callback.
   * @param {number} currentTime
   * @private
   */
  _loop(currentTime) {
    if (!this.isRunning) return;

    let delta = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    // Prevent spiral of death if tab was inactive (clamp to 100ms)
    if (delta > 0.1) {
      delta = 0.1;
    }

    // Telemetry FPS tracking
    this.frameCount++;
    this.fpsTimer += delta;
    if (this.fpsTimer >= 0.5) {
      this.fps = Math.round((this.frameCount / this.fpsTimer));
      this.frameCount = 0;
      this.fpsTimer = 0;
    }

    if (!this.isPaused) {
      this.accumulator += delta * this.timeScale;

      // Consume accumulated time in fixed discrete slices
      while (this.accumulator >= this.fixedTimestep) {
        this.updateFn(this.fixedTimestep);
        this.accumulator -= this.fixedTimestep;
      }
    }

    // Render with interpolation factor alpha for sub-frame smoothing
    const alpha = this.accumulator / this.fixedTimestep;
    this.renderFn(alpha, delta);

    this.animationFrameId = requestAnimationFrame(this._loop);
  }
}

