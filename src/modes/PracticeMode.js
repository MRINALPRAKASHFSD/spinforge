/**
 * SPINFORGE - PracticeMode
 * Free-spin physics laboratory for testing part configurations, launch angles, and telemetry.
 */

import { GameMode } from './GameMode.js';
import { Vector2 } from '../engine/Vector2.js';
import { TopBuilder } from '../progression/TopBuilder.js';
import { LAYERS, DISCS, DRIVERS } from '../progression/PartRegistry.js';

export class PracticeMode extends GameMode {
  constructor() {
    super('practice', 'Training Sandbox');
    /** @type {import('../engine/SpinningTop.js').SpinningTop | null} */
    this.playerTop = null;
    /** @type {import('../engine/SpinningTop.js').SpinningTop | null} */
    this.targetDummy = null;
    this.isLaunched = false;
  }

  start() {
    if (!this.engine) return;

    this.engine.clearTops();
    this.isLaunched = false;

    // Load active player top
    const loadout = this.progression?.profile.currentLoadout || {
      layerId: LAYERS[0].id,
      discId: DISCS[0].id,
      driverId: DRIVERS[0].id,
    };

    this.playerTop = TopBuilder.build({
      id: 'practice_player',
      owner: 'player',
      layerId: loadout.layerId,
      discId: loadout.discId,
      driverId: loadout.driverId,
    });

    // Spawn a stationary heavy test dummy in the center bowl
    this.targetDummy = TopBuilder.build({
      id: 'practice_dummy',
      owner: 'dummy',
      layerId: LAYERS[1].id,
      discId: DISCS[0].id,
      driverId: DRIVERS[2].id,
    });
    this.targetDummy.name = 'Training Dummy';
    this.targetDummy.launch(new Vector2(0, 0), new Vector2(0, 0), 7500);

    this.engine.registerTop(this.playerTop);
    this.engine.registerTop(this.targetDummy);

    this.emit({
      type: 'practice_ready',
      playerTop: this.playerTop,
      targetDummy: this.targetDummy,
    });
  }

  /**
   * Launch player top in practice.
   * @param {{ position: Vector2, velocity: Vector2, rpm: number }} launch
   */
  launch(launch) {
    if (!this.playerTop) return;
    this.playerTop.launch(launch.position, launch.velocity, launch.rpm);
    this.isLaunched = true;

    this.emit({
      type: 'practice_launched',
      rpm: launch.rpm,
    });
  }

  /**
   * Keep dummy active or reset on demand.
   * @param {number} dt
   */
  update(dt) {
    if (this.targetDummy && this.targetDummy.rpm < 2000) {
      // Re-spin dummy if it slows down too much in practice mode
      this.targetDummy.rpm = 7500;
      this.targetDummy.isAlive = true;
      this.targetDummy.isSleeping = false;
    }
  }

  teardown() {
    if (this.engine) {
      this.engine.clearTops();
    }
    this.playerTop = null;
    this.targetDummy = null;
  }
}

