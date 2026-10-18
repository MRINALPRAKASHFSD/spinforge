/**
 * SPINFORGE - GameMode (Base Interface)
 * Base class governing game rules, scoring conditions, round lifecycles, and entity spawning.
 */

export class GameMode {
  /**
   * @param {string} id
   * @param {string} name
   */
  constructor(id, name) {
    this.id = id;
    this.name = name;

    /** @type {import('../engine/GameEngine.js').GameEngine | null} */
    this.engine = null;
    /** @type {import('../progression/ProgressionManager.js').ProgressionManager | null} */
    this.progression = null;

    /** @type {Set<(event: { type: string, [key: string]: any }) => void>} */
    this.modeListeners = new Set();
  }

  /**
   * Initialize mode with references.
   * @param {import('../engine/GameEngine.js').GameEngine} engine
   * @param {import('../progression/ProgressionManager.js').ProgressionManager} progression
   */
  init(engine, progression) {
    this.engine = engine;
    this.progression = progression;
  }

  /**
   * Subscribe to mode state events (e.g. round won, match ended).
   * @param {(event: { type: string, [key: string]: any }) => void} listener
   * @returns {() => void}
   */
  onEvent(listener) {
    this.modeListeners.add(listener);
    return () => this.modeListeners.delete(listener);
  }

  /**
   * Emit mode event to subscribers.
   * @param {{ type: string, [key: string]: any }} event
   * @protected
   */
  emit(event) {
    for (const listener of this.modeListeners) {
      try {
        listener(event);
      } catch (err) {
        console.error(`Error in mode listener (${this.id}):`, err);
      }
    }
  }

  /**
   * Start or restart mode.
   */
  start() {}

  /**
   * Mode update tick called every frame.
   * @param {number} dt Delta time in seconds
   */
  update(dt) {}

  /**
   * Handle physics simulation events (collisions, knockouts, bursts).
   * @param {{ type: string, [key: string]: any }} event
   */
  handlePhysicsEvent(event) {}

  /**
   * Teardown / cleanup mode.
   */
  teardown() {}
}

