/**
 * SPINFORGE - ProgressionManager
 * Handles player progression, battle rewards, part unlocks, loadouts, and persistent storage.
 */

import { LAYERS, DISCS, DRIVERS } from './PartRegistry.js';

const STORAGE_KEY = 'spinforge_save_v1';

function getStorage() {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  if (typeof localStorage !== 'undefined') {
    return localStorage;
  }
  return null;
}

export class ProgressionManager {
  constructor() {
    this.profile = {
      level: 1,
      xp: 0,
      credits: 250,
      battlesWon: 0,
      battlesLost: 0,
      totalCollisions: 0,
      unlockedParts: {
        layers: [LAYERS[0].id, LAYERS[1].id],
        discs: [DISCS[0].id, DISCS[1].id],
        drivers: [DRIVERS[0].id, DRIVERS[1].id],
      },
      currentLoadout: {
        layerId: LAYERS[0].id,
        discId: DISCS[0].id,
        driverId: DRIVERS[0].id,
      },
    };

    this.load();
  }

  /**
   * Save current state to localStorage.
   */
  save() {
    try {
      const storage = getStorage();
      if (storage) {
        storage.setItem(STORAGE_KEY, JSON.stringify(this.profile));
      }
    } catch (e) {
      console.warn('LocalStorage unavailable for saving:', e);
    }
  }

  /**
   * Load saved profile state.
   */
  load() {
    try {
      const storage = getStorage();
      if (storage) {
        const raw = storage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          this.profile = { ...this.profile, ...parsed };
        }
      }
    } catch (e) {
      console.warn('Could not parse saved profile:', e);
    }
  }

  /**
   * Record a match outcome and reward XP / credits.
   * @param {boolean} won
   * @param {number} collisions
   * @returns {{ xpGained: number, creditsGained: number, leveledUp: boolean }}
   */
  recordMatchResult(won, collisions = 0) {
    this.profile.totalCollisions += collisions;

    let xpGained = won ? 150 : 50;
    let creditsGained = won ? 100 : 30;

    if (won) {
      this.profile.battlesWon++;
    } else {
      this.profile.battlesLost++;
    }

    this.profile.xp += xpGained;
    this.profile.credits += creditsGained;

    // Level up calculation: every 300 XP
    const nextLevel = Math.floor(this.profile.xp / 300) + 1;
    const leveledUp = nextLevel > this.profile.level;
    this.profile.level = nextLevel;

    // Check if new parts should unlock
    this._checkUnlocks();

    this.save();

    return { xpGained, creditsGained, leveledUp };
  }

  /**
   * Automatically unlocks parts as player levels up.
   * @private
   */
  _checkUnlocks() {
    const lvl = this.profile.level;

    for (const layer of LAYERS) {
      if (!this.profile.unlockedParts.layers.includes(layer.id) && lvl >= 2) {
        this.profile.unlockedParts.layers.push(layer.id);
      }
    }
    for (const disc of DISCS) {
      if (!this.profile.unlockedParts.discs.includes(disc.id) && lvl >= 3) {
        this.profile.unlockedParts.discs.push(disc.id);
      }
    }
    for (const driver of DRIVERS) {
      if (!this.profile.unlockedParts.drivers.includes(driver.id) && lvl >= 2) {
        this.profile.unlockedParts.drivers.push(driver.id);
      }
    }
  }

  /**
   * Update active loadout.
   * @param {string} layerId
   * @param {string} discId
   * @param {string} driverId
   */
  setLoadout(layerId, discId, driverId) {
    this.profile.currentLoadout = { layerId, discId, driverId };
    this.save();
  }

  /**
   * Reset save data.
   */
  resetProgress() {
    const storage = getStorage();
    if (storage) {
      storage.removeItem(STORAGE_KEY);
    }
    this.profile = {
      level: 1,
      xp: 0,
      credits: 250,
      battlesWon: 0,
      battlesLost: 0,
      totalCollisions: 0,
      unlockedParts: {
        layers: [LAYERS[0].id, LAYERS[1].id],
        discs: [DISCS[0].id, DISCS[1].id],
        drivers: [DRIVERS[0].id, DRIVERS[1].id],
      },
      currentLoadout: {
        layerId: LAYERS[0].id,
        discId: DISCS[0].id,
        driverId: DRIVERS[0].id,
      },
    };
  }
}
