/**
 * SPINFORGE - SurvivalMode
 * Wave-based endurance challenge where the player fights consecutive tops.
 */

import { GameMode } from './GameMode.js';
import { Vector2 } from '../engine/Vector2.js';
import { TopBuilder } from '../progression/TopBuilder.js';
import { LAYERS, DISCS, DRIVERS } from '../progression/PartRegistry.js';

export class SurvivalMode extends GameMode {
  constructor() {
    super('survival', 'Survival Gauntlet');
    this.wave = 1;
    this.highScore = 0;
    /** @type {import('../engine/SpinningTop.js').SpinningTop | null} */
    this.playerTop = null;
    /** @type {import('../engine/SpinningTop.js').SpinningTop | null} */
    this.currentEnemy = null;
    this.isGameOver = false;
  }

  start() {
    if (!this.engine) return;

    this.engine.clearTops();
    this.wave = 1;
    this.isGameOver = false;

    const loadout = this.progression?.profile.currentLoadout || {
      layerId: LAYERS[0].id,
      discId: DISCS[0].id,
      driverId: DRIVERS[0].id,
    };

    this.playerTop = TopBuilder.build({
      id: 'survival_player',
      owner: 'player',
      layerId: loadout.layerId,
      discId: loadout.discId,
      driverId: loadout.driverId,
    });

    this.engine.registerTop(this.playerTop);
    this._spawnNextWaveEnemy();

    this.emit({
      type: 'survival_ready',
      wave: this.wave,
      playerTop: this.playerTop,
    });
  }

  /**
   * Spawns an increasingly formidable challenger for the current wave.
   * @private
   */
  _spawnNextWaveEnemy() {
    if (this.currentEnemy && this.engine) {
      this.engine.unregisterTop(this.currentEnemy);
    }

    const layer = LAYERS[(this.wave - 1) % LAYERS.length];
    const disc = DISCS[(this.wave - 1) % DISCS.length];
    const driver = DRIVERS[(this.wave - 1) % DRIVERS.length];

    this.currentEnemy = TopBuilder.build({
      id: `enemy_wave_${this.wave}`,
      owner: 'cpu',
      layerId: layer.id,
      discId: disc.id,
      driverId: driver.id,
    });
    this.currentEnemy.name = `Wave ${this.wave}: ${layer.name}`;

    // Scale stats with wave number
    this.currentEnemy.attackPower += this.wave * 4;
    this.currentEnemy.defensePower += this.wave * 3;

    if (this.engine) {
      this.engine.registerTop(this.currentEnemy);
    }

    // Launch enemy top automatically
    const angle = Math.PI / 2 + (Math.random() - 0.5) * 0.6;
    const speed = 200 + this.wave * 15;
    const spawnPos = new Vector2(0, (this.engine?.arena.radius || 260) * 0.7);
    const rpm = Math.min(9500, 6500 + this.wave * 350);

    this.currentEnemy.launch(spawnPos, Vector2.fromPolar(angle, speed), rpm);

    this.emit({
      type: 'wave_started',
      wave: this.wave,
      enemy: this.currentEnemy,
    });
  }

  /**
   * Launch player into gauntlet.
   * @param {{ position: Vector2, velocity: Vector2, rpm: number }} launch
   */
  launch(launch) {
    if (!this.playerTop) return;
    this.playerTop.launch(launch.position, launch.velocity, launch.rpm);
  }

  update(dt) {
    if (this.isGameOver || !this.playerTop || !this.currentEnemy) return;

    // Check if player died
    if (!this.playerTop.isAlive) {
      this.isGameOver = true;
      this.highScore = Math.max(this.highScore, this.wave - 1);
      this.emit({
        type: 'survival_game_over',
        wavesCleared: this.wave - 1,
      });
      return;
    }

    // Check if enemy died -> advance wave!
    if (!this.currentEnemy.isAlive) {
      this.wave++;
      // Grant small stamina recovery to player top for clearing wave
      this.playerTop.rpm = Math.min(this.playerTop.maxRpm, this.playerTop.rpm + 1500);
      this._spawnNextWaveEnemy();
    }
  }

  teardown() {
    if (this.engine) {
      this.engine.clearTops();
    }
    this.playerTop = null;
    this.currentEnemy = null;
  }
}

