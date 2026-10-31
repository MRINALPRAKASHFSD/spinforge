/**
 * SPINFORGE - Progression & Parts Tests
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { LAYERS, DISCS, DRIVERS } from '../src/progression/PartRegistry.js';
import { TopBuilder } from '../src/progression/TopBuilder.js';
import { ProgressionManager } from '../src/progression/ProgressionManager.js';

describe('Progression: PartRegistry', () => {
  test('Catalog contains valid energy layers, discs, and drivers', () => {
    assert.ok(LAYERS.length >= 3);
    assert.ok(DISCS.length >= 3);
    assert.ok(DRIVERS.length >= 3);

    for (const l of LAYERS) {
      assert.ok(l.id && l.name && l.attack > 0 && l.bladePoints > 0);
    }
  });
});

describe('Progression: TopBuilder', () => {
  test('Assembles top from parts and calculates aggregate stats', () => {
    const stats = TopBuilder.calculateStats(LAYERS[0].id, DISCS[0].id, DRIVERS[0].id);
    assert.ok(stats.attackPower > 0);
    assert.ok(stats.totalWeight > 0);
    assert.ok(stats.burstResistance >= 100);

    const top = TopBuilder.build({
      layerId: LAYERS[0].id,
      discId: DISCS[0].id,
      driverId: DRIVERS[0].id,
    });

    assert.strictEqual(top.attackPower, stats.attackPower);
    assert.strictEqual(top.archetype, stats.archetype);
  });
});

describe('Progression: ProgressionManager', () => {
  test('Initializes profile with starter credits and unlocked parts', () => {
    const pm = new ProgressionManager();
    assert.strictEqual(pm.profile.level, 1);
    assert.ok(pm.profile.credits >= 100);
    assert.ok(pm.profile.unlockedParts.layers.length >= 2);
  });

  test('Records match outcome and awards XP / credits', () => {
    const pm = new ProgressionManager();
    const prevXp = pm.profile.xp;
    const prevCredits = pm.profile.credits;

    const result = pm.recordMatchResult(true, 5);
    assert.ok(result.xpGained > 0);
    assert.ok(result.creditsGained > 0);
    assert.strictEqual(pm.profile.battlesWon, 1);
    assert.strictEqual(pm.profile.xp, prevXp + result.xpGained);
    assert.strictEqual(pm.profile.credits, prevCredits + result.creditsGained);
  });
});

