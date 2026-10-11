/**
 * SPINFORGE - GameEngine
 * Master engine orchestrator coordinating physics world, arena rules, entities, and the game loop.
 */

import { Arena } from './Arena.js';
import { PhysicsWorld } from './PhysicsWorld.js';
import { GameLoop } from './GameLoop.js';
import { SpinningTop } from './SpinningTop.js';

export class GameEngine {
  /**
   * @param {Object} [config]
   * @param {Arena} [config.arena]
   */
  constructor(config = {}) {
    this.arena = config.arena || new Arena();
    this.world = new PhysicsWorld(this.arena);

    this.loop = new GameLoop({
      update: (dt) => this.update(dt),
      render: (alpha, dt) => this.onRenderCallback(alpha, dt),
    });

    /** @type {(alpha: number, dt: number) => void} */
    this.onRenderCallback = () => {};

    /** @type {Set<(event: { type: string, [key: string]: any }) => void>} */
    this.eventListeners = new Set();

    // Bubble up physics world events
    this.world.onEvent((event) => this._emit(event));
  }

  /**
   * Register a top into the engine's active world.
   * @param {SpinningTop} top
   */
  registerTop(top) {
    this.world.addTop(top);
  }

  /**
   * Unregister a top from the active world.
   * @param {SpinningTop} top
   */
  unregisterTop(top) {
    this.world.removeTop(top);
  }

  /**
   * Clear all tops from the world.
   */
  clearTops() {
    this.world.clear();
  }

  /**
   * Returns list of currently active tops.
   * @returns {SpinningTop[]}
   */
  getTops() {
    return this.world.tops;
  }

  /**
   * Set callback for render pass.
   * @param {(alpha: number, dt: number) => void} cb
   */
  setRenderCallback(cb) {
    this.onRenderCallback = cb;
  }

  /**
   * Subscribe to engine events.
   * @param {(event: { type: string, [key: string]: any }) => void} listener
   * @returns {() => void}
   */
  onEvent(listener) {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  /**
   * Dispatch engine event.
   * @param {{ type: string, [key: string]: any }} event
   * @private
   */
  _emit(event) {
    for (const listener of this.eventListeners) {
      try {
        listener(event);
      } catch (err) {
        console.error('Error in GameEngine listener:', err);
      }
    }
  }

  /**
   * Step physics forward.
   * @param {number} dt Delta time in seconds
   */
  update(dt) {
    this.world.step(dt);
  }

  /**
   * Start engine loop.
   */
  start() {
    this.loop.start();
    this._emit({ type: 'engine_started' });
  }

  /**
   * Stop engine loop.
   */
  stop() {
    this.loop.stop();
    this._emit({ type: 'engine_stopped' });
  }

  /**
   * Pause engine.
   */
  pause() {
    this.loop.pause();
    this._emit({ type: 'engine_paused' });
  }

  /**
   * Resume engine.
   */
  resume() {
    this.loop.resume();
    this._emit({ type: 'engine_resumed' });
  }
}

