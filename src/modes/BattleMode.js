/**
 * SPINFORGE - BattleMode
 * Standard 1v1 competitive arena battle against an AI opponent with official point rules
 * and simultaneous elimination resolution via WinnerDetermination.
 */

import { GameMode } from './GameMode.js';
import { Vector2 } from '../engine/Vector2.js';
import { FINISH_TYPES, BATTLE_RULES } from '../engine/constants.js';
import { WinnerDetermination } from '../engine/WinnerDetermination.js';
import { TopBuilder } from '../progression/TopBuilder.js';
import { LAYERS, DISCS, DRIVERS } from '../progression/PartRegistry.js';

export const BATTLE_STATES = {
  READY_TO_LAUNCH: 'READY_TO_LAUNCH',
  IN_BATTLE: 'IN_BATTLE',
  ROUND_OVER: 'ROUND_OVER',
  MATCH_OVER: 'MATCH_OVER',
};

export class BattleMode extends GameMode {
  constructor() {
    super('battle', '1v1 Arena Battle');

    this.state = BATTLE_STATES.READY_TO_LAUNCH;

    // Match scoring
    this.pointsToWin = BATTLE_RULES.POINTS_TO_WIN;
    this.playerScore = 0;
    this.opponentScore = 0;
    this.drawsCount = 0;
    this.currentRound = 1;

    /** @type {import('../engine/SpinningTop.js').SpinningTop | null} */
    this.playerTop = null;
    /** @type {import('../engine/SpinningTop.js').SpinningTop | null} */
    this.opponentTop = null;

    this.roundEndTimer = 0;
    this.lastFinish = null;
  }

  /**
   * Initializes tops and prepares first round.
   */
  start() {
    this.playerScore = 0;
    this.opponentScore = 0;
    this.drawsCount = 0;
    this.currentRound = 1;
    this._prepareRound();
  }

  /**
   * Prepares round entities.
   * @private
   */
  _prepareRound() {
    if (!this.engine) return;

    this.engine.clearTops();
    this.state = BATTLE_STATES.READY_TO_LAUNCH;
    this.roundEndTimer = 0;
    this.lastFinish = null;

    // Build player top from active loadout
    const loadout = this.progression?.profile.currentLoadout || {
      layerId: LAYERS[0].id,
      discId: DISCS[0].id,
      driverId: DRIVERS[0].id,
    };

    this.playerTop = TopBuilder.build({
      id: 'player_top',
      owner: 'player',
      layerId: loadout.layerId,
      discId: loadout.discId,
      driverId: loadout.driverId,
    });

    // Build varied opponent top
    const oppLayer = LAYERS[this.currentRound % LAYERS.length];
    const oppDisc = DISCS[this.currentRound % DISCS.length];
    const oppDriver = DRIVERS[this.currentRound % DRIVERS.length];

    this.opponentTop = TopBuilder.build({
      id: 'opponent_top',
      owner: 'cpu',
      layerId: oppLayer.id,
      discId: oppDisc.id,
      driverId: oppDriver.id,
    });
    this.opponentTop.name = `Apex ${oppLayer.name.split(' ')[0]}`;

    this.engine.registerTop(this.playerTop);
    this.engine.registerTop(this.opponentTop);

    this.emit({
      type: 'round_prepared',
      round: this.currentRound,
      playerScore: this.playerScore,
      opponentScore: this.opponentScore,
      playerTop: this.playerTop,
      opponentTop: this.opponentTop,
    });
  }

  /**
   * Launches tops into battle arena.
   * @param {{ position: Vector2, velocity: Vector2, rpm: number }} playerLaunch
   */
  launch(playerLaunch) {
    if (this.state !== BATTLE_STATES.READY_TO_LAUNCH || !this.playerTop || !this.opponentTop) {
      return;
    }

    // Launch Player Top
    this.playerTop.launch(playerLaunch.position, playerLaunch.velocity, playerLaunch.rpm);

    // AI launches from opposite side of rim with dynamic reaction
    const oppAngle = Math.PI / 2 + (Math.random() - 0.5) * 0.5;
    const oppSpeed = 220 + Math.random() * 200;
    const oppSpawn = new Vector2(0, this.engine.arena.radius * 0.7);
    const oppVel = Vector2.fromPolar(oppAngle, oppSpeed);
    const oppRpm = 6800 + Math.floor(Math.random() * 2000);

    this.opponentTop.launch(oppSpawn, oppVel, oppRpm);

    this.state = BATTLE_STATES.IN_BATTLE;

    this.emit({
      type: 'battle_started',
      playerRpm: playerLaunch.rpm,
      opponentRpm: oppRpm,
    });
  }

  /**
   * AI behavior and round evaluation loop.
   * @param {number} dt
   */
  update(dt) {
    if (this.state === BATTLE_STATES.IN_BATTLE) {
      this._updateAI(dt);
      this._checkRoundFinish();
    } else if (this.state === BATTLE_STATES.ROUND_OVER) {
      this.roundEndTimer += dt;
    }
  }

  /**
   * Simple AI driving the CPU top based on its archetype.
   * @param {number} dt
   * @private
   */
  _updateAI(dt) {
    if (!this.opponentTop || !this.opponentTop.isAlive || !this.playerTop) return;

    if (this.opponentTop.archetype === 'attack' && this.playerTop.isAlive) {
      // Offensive rush towards player top
      const toPlayer = this.playerTop.position.clone().sub(this.opponentTop.position);
      if (toPlayer.length() > 35) {
        toPlayer.normalize().scale(90 * dt);
        this.opponentTop.applyForce(toPlayer);
      }
    } else if (this.opponentTop.archetype === 'defense') {
      // Counter-attack: stabilize near center bowl
      const toCenter = this.engine.arena.center.clone().sub(this.opponentTop.position);
      toCenter.normalize().scale(55 * dt);
      this.opponentTop.applyForce(toCenter);
    }
  }

  /**
   * Check for win/loss conditions during battle using WinnerDetermination.
   * @private
   */
  _checkRoundFinish() {
    if (!this.playerTop || !this.opponentTop) return;

    const evaluation = WinnerDetermination.evaluate(this.playerTop, this.opponentTop);
    if (!evaluation.isOver) return;

    this._resolveRound(evaluation);
  }

  /**
   * Resolves round score and checks if match is complete.
   * @param {Object} evaluation
   * @private
   */
  _resolveRound(evaluation) {
    this.lastFinish = evaluation;
    this.state = BATTLE_STATES.ROUND_OVER;

    if (evaluation.isDraw) {
      this.drawsCount++;
    } else if (evaluation.winner === this.playerTop) {
      this.playerScore += evaluation.points;
    } else if (evaluation.winner === this.opponentTop) {
      this.opponentScore += evaluation.points;
    }

    const matchWon = this.playerScore >= this.pointsToWin;
    const matchLost = this.opponentScore >= this.pointsToWin;
    const isMatchOver = matchWon || matchLost;

    let progressionResult = null;
    if (isMatchOver) {
      this.state = BATTLE_STATES.MATCH_OVER;
      if (this.progression) {
        const collisions = (this.playerTop?.collisionsCount || 0) + (this.opponentTop?.collisionsCount || 0);
        progressionResult = this.progression.recordMatchResult(matchWon, collisions);
      }
    }

    this.emit({
      type: 'round_ended',
      winner: evaluation.winner === this.playerTop ? 'player' : (evaluation.isDraw ? 'draw' : 'cpu'),
      points: evaluation.points,
      finishType: evaluation.finishType,
      isDraw: evaluation.isDraw,
      reason: evaluation.reason,
      playerScore: this.playerScore,
      opponentScore: this.opponentScore,
      isMatchOver,
      matchWon,
      progressionResult,
    });
  }

  /**
   * Advance to the next round.
   */
  nextRound() {
    if (this.state === BATTLE_STATES.MATCH_OVER) {
      this.start();
    } else {
      this.currentRound++;
      this._prepareRound();
    }
  }

  /**
   * Cleanup.
   */
  teardown() {
    if (this.engine) {
      this.engine.clearTops();
    }
    this.playerTop = null;
    this.opponentTop = null;
  }
}
