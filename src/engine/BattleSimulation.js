/**
 * SPINFORGE - BattleSimulation
 * Unified battle simulation engine orchestrating fixed-timestep physics,
 * top-to-top momentum exchanges, stamina depletion, boundary rules, and winner determination.
 * Supports complete playable head-to-head battles with or without a UI.
 */

import { PhysicsWorld } from './PhysicsWorld.js';
import { Arena } from './Arena.js';
import { WinnerDetermination } from './WinnerDetermination.js';
import { BATTLE_RULES, FIXED_TIMESTEP, FINISH_TYPES } from './constants.js';

export const SIMULATION_STATES = {
  READY: 'READY',
  IN_PROGRESS: 'IN_PROGRESS',
  ROUND_OVER: 'ROUND_OVER',
  MATCH_OVER: 'MATCH_OVER',
};

export class BattleSimulation {
  /**
   * @param {Object} [config]
   * @param {Arena} [config.arena]
   * @param {import('./SpinningTop.js').SpinningTop} [config.playerTop]
   * @param {import('./SpinningTop.js').SpinningTop} [config.opponentTop]
   * @param {number} [config.pointsToWin=3]
   * @param {number} [config.simultaneousThresholdSec=0.08]
   */
  constructor(config = {}) {
    this.arena = config.arena || new Arena();
    this.world = new PhysicsWorld(this.arena);

    this.playerTop = config.playerTop || null;
    this.opponentTop = config.opponentTop || null;

    if (this.playerTop) this.world.addTop(this.playerTop);
    if (this.opponentTop) this.world.addTop(this.opponentTop);

    this.pointsToWin = config.pointsToWin ?? BATTLE_RULES.POINTS_TO_WIN;
    this.simultaneousThresholdSec = config.simultaneousThresholdSec ?? BATTLE_RULES.SIMULTANEOUS_THRESHOLD_SEC;

    // Match scoring state
    this.state = SIMULATION_STATES.READY;
    this.playerScore = 0;
    this.opponentScore = 0;
    this.roundNumber = 1;
    this.drawsCount = 0;
    this.elapsedRoundTime = 0;

    /** @type {Object | null} */
    this.lastRoundResult = null;

    /** @type {Set<(event: { type: string, [key: string]: any }) => void>} */
    this.listeners = new Set();

    // Bubble up physical events
    this.world.onEvent((event) => this._emit(event));
  }

  /**
   * Assign or replace fighting tops.
   * @param {import('./SpinningTop.js').SpinningTop} playerTop
   * @param {import('./SpinningTop.js').SpinningTop} opponentTop
   */
  setTops(playerTop, opponentTop) {
    this.world.clear();
    this.playerTop = playerTop;
    this.opponentTop = opponentTop;
    this.world.addTop(this.playerTop);
    this.world.addTop(this.opponentTop);
  }

  /**
   * Subscribe to battle simulation events.
   * @param {(event: { type: string, [key: string]: any }) => void} listener
   * @returns {() => void}
   */
  onEvent(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Dispatches simulation event.
   * @param {{ type: string, [key: string]: any }} event
   * @private
   */
  _emit(event) {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        console.error('BattleSimulation listener error:', err);
      }
    }
  }

  /**
   * Launches both tops into battle arena and begins the round.
   * @param {{ position: import('./Vector2.js').Vector2, velocity: import('./Vector2.js').Vector2, rpm: number }} playerLaunch
   * @param {{ position: import('./Vector2.js').Vector2, velocity: import('./Vector2.js').Vector2, rpm: number }} opponentLaunch
   */
  startRound(playerLaunch, opponentLaunch) {
    if (!this.playerTop || !this.opponentTop) {
      throw new Error('Cannot start round: tops not assigned.');
    }

    this.playerTop.launch(playerLaunch.position, playerLaunch.velocity, playerLaunch.rpm);
    this.opponentTop.launch(opponentLaunch.position, opponentLaunch.velocity, opponentLaunch.rpm);

    this.state = SIMULATION_STATES.IN_PROGRESS;
    this.elapsedRoundTime = 0;
    this.lastRoundResult = null;

    this._emit({
      type: 'round_started',
      round: this.roundNumber,
      playerTop: this.playerTop,
      opponentTop: this.opponentTop,
    });
  }

  /**
   * Advances simulation by fixed timestep dt.
   * @param {number} [dt=0.016667]
   * @returns {Object} Current status of the round
   */
  step(dt = FIXED_TIMESTEP) {
    if (this.state !== SIMULATION_STATES.IN_PROGRESS) {
      return { state: this.state, roundOver: this.state !== SIMULATION_STATES.IN_PROGRESS };
    }

    this.elapsedRoundTime += dt;

    // 1. Step physics world
    this.world.step(dt);

    // 2. Evaluate round victory / elimination
    const evaluation = WinnerDetermination.evaluate(this.playerTop, this.opponentTop, {
      simultaneousThresholdSec: this.simultaneousThresholdSec,
    });

    // Check timeout if tops spin endlessly without resolution
    if (!evaluation.isOver && this.elapsedRoundTime >= BATTLE_RULES.MAX_ROUND_DURATION_SEC) {
      evaluation.isOver = true;
      evaluation.finishType = FINISH_TYPES.SPIN_FINISH;
      evaluation.winner = this.playerTop.rpm >= this.opponentTop.rpm ? this.playerTop : this.opponentTop;
      evaluation.loser = evaluation.winner === this.playerTop ? this.opponentTop : this.playerTop;
      evaluation.points = 1;
      evaluation.reason = 'TIMEOUT_RPM_DECISION';
    }

    if (evaluation.isOver) {
      this._resolveRound(evaluation);
    }

    return {
      state: this.state,
      roundOver: evaluation.isOver,
      evaluation,
    };
  }

  /**
   * Resolves round scoring, checks for match conclusion, and emits events.
   * @param {Object} evaluation
   * @private
   */
  _resolveRound(evaluation) {
    this.state = SIMULATION_STATES.ROUND_OVER;
    this.lastRoundResult = evaluation;

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

    if (isMatchOver) {
      this.state = SIMULATION_STATES.MATCH_OVER;
    }

    this._emit({
      type: 'round_finished',
      round: this.roundNumber,
      result: evaluation,
      playerScore: this.playerScore,
      opponentScore: this.opponentScore,
      isMatchOver,
      matchWinner: isMatchOver ? (matchWon ? this.playerTop : this.opponentTop) : null,
    });

    if (isMatchOver) {
      this._emit({
        type: 'match_finished',
        winner: matchWon ? this.playerTop : this.opponentTop,
        finalScore: { player: this.playerScore, opponent: this.opponentScore },
        roundsPlayed: this.roundNumber,
      });
    }
  }

  /**
   * Prepares next round.
   */
  nextRound() {
    if (this.state === SIMULATION_STATES.MATCH_OVER) {
      this.resetMatch();
    } else {
      this.roundNumber++;
      this.state = SIMULATION_STATES.READY;
    }
  }

  /**
   * Resets entire match.
   */
  resetMatch() {
    this.playerScore = 0;
    this.opponentScore = 0;
    this.roundNumber = 1;
    this.drawsCount = 0;
    this.elapsedRoundTime = 0;
    this.state = SIMULATION_STATES.READY;
    this.lastRoundResult = null;
    if (this.playerTop) this.playerTop.reset();
    if (this.opponentTop) this.opponentTop.reset();
  }

  /**
   * Headless execution runner: simulates round to completion without requiring UI.
   * Executes deterministic ticks until round ends or max time limit is reached.
   * @param {number} [maxDurationSec=45]
   * @param {number} [dt=0.016667]
   * @returns {{ completed: boolean, durationSec: number, ticks: number, result: Object, totalCollisions: number }}
   */
  runUntilComplete(maxDurationSec = 45, dt = FIXED_TIMESTEP) {
    if (this.state !== SIMULATION_STATES.IN_PROGRESS) {
      throw new Error('Simulation not started. Call startRound() first.');
    }

    let ticks = 0;
    const maxTicks = Math.ceil(maxDurationSec / dt);

    while (this.state === SIMULATION_STATES.IN_PROGRESS && ticks < maxTicks) {
      this.step(dt);
      ticks++;
    }

    const totalCollisions = (this.playerTop?.collisionsCount || 0) + (this.opponentTop?.collisionsCount || 0);

    return {
      completed: this.state === SIMULATION_STATES.ROUND_OVER || this.state === SIMULATION_STATES.MATCH_OVER,
      durationSec: ticks * dt,
      ticks,
      result: this.lastRoundResult,
      totalCollisions,
      playerScore: this.playerScore,
      opponentScore: this.opponentScore,
    };
  }
}

