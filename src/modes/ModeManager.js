/**
 * SPINFORGE - ModeManager
 * Manages game mode transitions, active mode lifecycle, and physics event routing.
 */

import { BattleMode } from './BattleMode.js';
import { PracticeMode } from './PracticeMode.js';
import { SurvivalMode } from './SurvivalMode.js';
import { TournamentMode } from './TournamentMode.js';

export class ModeManager {
  /**
   * @param {import('../engine/GameEngine.js').GameEngine} engine
   * @param {import('../progression/ProgressionManager.js').ProgressionManager} progression
   */
  constructor(engine, progression) {
    this.engine = engine;
    this.progression = progression;

    /** @type {Map<string, import('./GameMode.js').GameMode>} */
    this.modes = new Map();

    // Register built-in game modes
    this.registerMode(new BattleMode());
    this.registerMode(new TournamentMode());
    this.registerMode(new PracticeMode());
    this.registerMode(new SurvivalMode());

    /** @type {import('./GameMode.js').GameMode | null} */
    this.activeMode = null;

    /** @type {Set<(mode: import('./GameMode.js').GameMode) => void>} */
    this.modeChangeListeners = new Set();

    // Route engine events to active mode
    this.engine.onEvent((event) => {
      if (this.activeMode) {
        this.activeMode.handlePhysicsEvent(event);
      }
    });
  }

  /**
   * Register a new game mode.
   * @param {import('./GameMode.js').GameMode} mode
   */
  registerMode(mode) {
    mode.init(this.engine, this.progression);
    this.modes.set(mode.id, mode);
  }

  /**
   * Switches to a designated game mode.
   * @param {string} modeId 'battle' | 'tournament' | 'practice' | 'survival'
   * @returns {import('./GameMode.js').GameMode}
   */
  setMode(modeId) {
    const nextMode = this.modes.get(modeId);
    if (!nextMode) {
      throw new Error(`Game mode '${modeId}' not found.`);
    }

    if (this.activeMode) {
      this.activeMode.teardown();
    }

    this.activeMode = nextMode;
    this.activeMode.start();

    for (const listener of this.modeChangeListeners) {
      listener(this.activeMode);
    }

    return this.activeMode;
  }

  /**
   * Subscribe to mode change events.
   * @param {(mode: import('./GameMode.js').GameMode) => void} listener
   * @returns {() => void}
   */
  onModeChange(listener) {
    this.modeChangeListeners.add(listener);
    return () => this.modeChangeListeners.delete(listener);
  }

  /**
   * Frame update for current active mode.
   * @param {number} dt Delta time in seconds
   */
  update(dt) {
    if (this.activeMode) {
      this.activeMode.update(dt);
    }
  }
}
