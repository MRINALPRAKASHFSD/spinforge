/**
 * SPINFORGE - TopBuilder
 * Combines Layer, Disc, and Driver components to calculate aggregate stats and instantiate battle tops.
 */

import { SpinningTop } from '../engine/SpinningTop.js';
import { LAYERS, DISCS, DRIVERS } from './PartRegistry.js';

export class TopBuilder {
  /**
   * Find part by ID.
   * @param {string} layerId
   * @param {string} discId
   * @param {string} driverId
   */
  static getParts(layerId, discId, driverId) {
    const layer = LAYERS.find((p) => p.id === layerId) || LAYERS[0];
    const disc = DISCS.find((p) => p.id === discId) || DISCS[0];
    const driver = DRIVERS.find((p) => p.id === driverId) || DRIVERS[0];
    return { layer, disc, driver };
  }

  /**
   * Calculates composite combat stats from chosen parts.
   * @param {string} layerId
   * @param {string} discId
   * @param {string} driverId
   */
  static calculateStats(layerId, discId, driverId) {
    const { layer, disc, driver } = this.getParts(layerId, discId, driverId);

    const totalWeight = layer.weight + disc.weight;
    const attackPower = Math.round(layer.attack * (driver.archetype === 'attack' ? 1.2 : 1.0));
    const defensePower = Math.round(layer.defense + (disc.stabilityBonus || 10));
    const staminaRating = Math.round(layer.stamina * (driver.staminaMultiplier || 1.0));
    const burstResistance = 100 + (disc.burstResistanceBonus || 15);

    return {
      name: `${layer.name} ${disc.name.split(' ')[0]} ${driver.name.split(' ')[0]}`,
      archetype: layer.archetype,
      totalWeight,
      attackPower,
      defensePower,
      staminaRating,
      burstResistance,
      bladePoints: layer.bladePoints,
      primaryColor: layer.primaryColor,
      accentColor: layer.accentColor,
      coreColor: layer.coreColor,
      driverSpeedMult: driver.speedMultiplier || 1.0,
    };
  }

  /**
   * Assembles a ready-to-fight SpinningTop instance.
   * @param {Object} options
   * @param {string} [options.id]
   * @param {string} [options.owner]
   * @param {string} [options.layerId]
   * @param {string} [options.discId]
   * @param {string} [options.driverId]
   * @returns {SpinningTop}
   */
  static build(options = {}) {
    const stats = this.calculateStats(
      options.layerId || LAYERS[0].id,
      options.discId || DISCS[0].id,
      options.driverId || DRIVERS[0].id
    );

    return new SpinningTop({
      id: options.id,
      name: stats.name,
      owner: options.owner || 'player',
      archetype: stats.archetype,
      mass: stats.totalWeight / 30, // normalized physics mass
      radius: 28,
      attackPower: stats.attackPower,
      defensePower: stats.defensePower,
      staminaRating: stats.staminaRating,
      burstResistance: stats.burstResistance,
      bladePoints: stats.bladePoints,
      primaryColor: stats.primaryColor,
      accentColor: stats.accentColor,
      coreColor: stats.coreColor,
    });
  }
}

