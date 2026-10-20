/**
 * SPINFORGE - TournamentMode
 * Single-elimination 8-competitor Championship Bracket (Quarterfinals -> Semifinals -> Grand Finals)
 * with AI match simulation and championship rewards.
 */

import { GameMode } from './GameMode.js';
import { Vector2 } from '../engine/Vector2.js';
import { FINISH_TYPES } from '../engine/constants.js';
import { WinnerDetermination } from '../engine/WinnerDetermination.js';
import { TopBuilder } from '../progression/TopBuilder.js';
import { LAYERS, DISCS, DRIVERS } from '../progression/PartRegistry.js';

export const TOURNAMENT_STATES = {
  BRACKET_VIEW: 'BRACKET_VIEW',
  READY_TO_LAUNCH: 'READY_TO_LAUNCH',
  IN_BATTLE: 'IN_BATTLE',
  ROUND_OVER: 'ROUND_OVER',
  MATCH_OVER: 'MATCH_OVER',
  TOURNAMENT_OVER: 'TOURNAMENT_OVER',
};

const RIVAL_PROFILES = [
  { name: 'Blaze Fang', layer: LAYERS[0].id, disc: DISCS[0].id, driver: DRIVERS[0].id },
  { name: 'Iron Aegis', layer: LAYERS[1].id, disc: DISCS[0].id, driver: DRIVERS[2].id },
  { name: 'Solar Corona', layer: LAYERS[2].id, disc: DISCS[2].id, driver: DRIVERS[1].id },
  { name: 'Phantom Cross', layer: LAYERS[3].id, disc: DISCS[2].id, driver: DRIVERS[0].id },
  { name: 'Storm Striker', layer: LAYERS[0].id, disc: DISCS[1].id, driver: DRIVERS[1].id },
  { name: 'Glacier Bastion', layer: LAYERS[1].id, disc: DISCS[2].id, driver: DRIVERS[2].id },
  { name: 'Nebula Phoenix', layer: LAYERS[2].id, disc: DISCS[1].id, driver: DRIVERS[1].id },
];

export class TournamentMode extends GameMode {
  constructor() {
    super('tournament', 'Championship Tournament');

    this.state = TOURNAMENT_STATES.BRACKET_VIEW;
    this.pointsToWin = 2; // Fast competitive tournament match format

    this.roundNames = ['Quarterfinals', 'Semifinals', 'Grand Finals'];
    this.tierIndex = 0; // 0: QF, 1: SF, 2: Finals
    this.matchIndexInTier = 0;

    this.playerScore = 0;
    this.opponentScore = 0;
    this.currentRoundInMatch = 1;

    /** @type {any[]} */
    this.bracket = [];
    /** @type {any} */
    this.champion = null;
    this.isPlayerChampion = false;

    /** @type {import('../engine/SpinningTop.js').SpinningTop | null} */
    this.playerTop = null;
    /** @type {import('../engine/SpinningTop.js').SpinningTop | null} */
    this.opponentTop = null;
  }

  /**
   * Initializes a fresh 8-competitor tournament bracket.
   */
  start() {
    this.tierIndex = 0;
    this.matchIndexInTier = 0;
    this.champion = null;
    this.isPlayerChampion = false;

    this._initializeBracket();
    this._prepareCurrentMatch();

    this.emit({
      type: 'tournament_started',
      bracket: this.bracket,
      currentTier: this.tierIndex,
      tierName: this.roundNames[this.tierIndex],
    });
  }

  /**
   * Setup 8-competitor single elimination bracket tree.
   * @private
   */
  _initializeBracket() {
    const playerLoadout = this.progression?.profile.currentLoadout || {
      layerId: LAYERS[0].id,
      discId: DISCS[0].id,
      driverId: DRIVERS[0].id,
    };

    const playerEntry = {
      id: 'player_entry',
      name: 'Vortex Striker (You)',
      isPlayer: true,
      layerId: playerLoadout.layerId,
      discId: playerLoadout.discId,
      driverId: playerLoadout.driverId,
    };

    const rivals = RIVAL_PROFILES.map((r, i) => ({
      id: `rival_${i + 1}`,
      name: r.name,
      isPlayer: false,
      layerId: r.layer,
      discId: r.disc,
      driverId: r.driver,
    }));

    // Round 0: Quarterfinals (4 matches)
    const round0 = [
      { id: 'qf_1', p1: playerEntry, p2: rivals[0], score: [0, 0], winner: null, isPlayerMatch: true },
      { id: 'qf_2', p1: rivals[1], p2: rivals[2], score: [0, 0], winner: null, isPlayerMatch: false },
      { id: 'qf_3', p1: rivals[3], p2: rivals[4], score: [0, 0], winner: null, isPlayerMatch: false },
      { id: 'qf_4', p1: rivals[5], p2: rivals[6], score: [0, 0], winner: null, isPlayerMatch: false },
    ];

    // Round 1: Semifinals (2 matches)
    const round1 = [
      { id: 'sf_1', p1: null, p2: null, score: [0, 0], winner: null, isPlayerMatch: true },
      { id: 'sf_2', p1: null, p2: null, score: [0, 0], winner: null, isPlayerMatch: false },
    ];

    // Round 2: Grand Finals (1 match)
    const round2 = [
      { id: 'gf_1', p1: null, p2: null, score: [0, 0], winner: null, isPlayerMatch: true },
    ];

    this.bracket = [round0, round1, round2];
  }

  /**
   * Prepare the tops for the current player tournament match.
   * @private
   */
  _prepareCurrentMatch() {
    if (!this.engine) return;

    this.engine.clearTops();
    this.playerScore = 0;
    this.opponentScore = 0;
    this.currentRoundInMatch = 1;

    const currentMatch = this._getCurrentPlayerMatch();
    if (!currentMatch) return;

    // Build player top
    const loadout = this.progression?.profile.currentLoadout || {
      layerId: currentMatch.p1.layerId,
      discId: currentMatch.p1.discId,
      driverId: currentMatch.p1.driverId,
    };

    this.playerTop = TopBuilder.build({
      id: 'player_top',
      owner: 'player',
      layerId: loadout.layerId,
      discId: loadout.discId,
      driverId: loadout.driverId,
    });

    // Build opponent top
    this.opponentTop = TopBuilder.build({
      id: 'opponent_top',
      owner: 'cpu',
      layerId: currentMatch.p2.layerId,
      discId: currentMatch.p2.discId,
      driverId: currentMatch.p2.driverId,
    });
    this.opponentTop.name = currentMatch.p2.name;

    this.engine.registerTop(this.playerTop);
    this.engine.registerTop(this.opponentTop);

    this.state = TOURNAMENT_STATES.READY_TO_LAUNCH;

    this.emit({
      type: 'round_prepared',
      round: this.currentRoundInMatch,
      tierIndex: this.tierIndex,
      tierName: this.roundNames[this.tierIndex],
      playerScore: this.playerScore,
      opponentScore: this.opponentScore,
      playerTop: this.playerTop,
      opponentTop: this.opponentTop,
      match: currentMatch,
    });
  }

  /**
   * Return current player match in current tier.
   * @private
   */
  _getCurrentPlayerMatch() {
    const tierMatches = this.bracket[this.tierIndex];
    if (!tierMatches) return null;
    return tierMatches.find((m) => m.isPlayerMatch) || tierMatches[0];
  }

  /**
   * Launches tops into battle.
   * @param {{ position: Vector2, velocity: Vector2, rpm: number }} playerLaunch
   */
  launch(playerLaunch) {
    if (this.state !== TOURNAMENT_STATES.READY_TO_LAUNCH || !this.playerTop || !this.opponentTop) {
      return;
    }

    this.playerTop.launch(playerLaunch.position, playerLaunch.velocity, playerLaunch.rpm);

    const oppAngle = Math.PI / 2 + (Math.random() - 0.5) * 0.5;
    const oppSpeed = 230 + Math.random() * 180;
    const oppSpawn = new Vector2(0, (this.engine?.arena.radius || 260) * 0.7);
    const oppRpm = 7000 + Math.floor(Math.random() * 2200);

    this.opponentTop.launch(oppSpawn, Vector2.fromPolar(oppAngle, oppSpeed), oppRpm);

    this.state = TOURNAMENT_STATES.IN_BATTLE;

    this.emit({
      type: 'battle_started',
      tierName: this.roundNames[this.tierIndex],
      playerRpm: playerLaunch.rpm,
      opponentRpm: oppRpm,
    });
  }

  /**
   * Update loop during battle.
   * @param {number} dt
   */
  update(dt) {
    if (this.state === TOURNAMENT_STATES.IN_BATTLE) {
      this._updateAI(dt);
      this._checkRoundFinish();
    }
  }

  /**
   * AI movement behavior.
   * @param {number} dt
   * @private
   */
  _updateAI(dt) {
    if (!this.opponentTop || !this.opponentTop.isAlive || !this.playerTop) return;

    if (this.opponentTop.archetype === 'attack') {
      const toPlayer = this.playerTop.position.clone().sub(this.opponentTop.position);
      if (toPlayer.length() > 35) {
        toPlayer.normalize().scale(95 * dt);
        this.opponentTop.applyForce(toPlayer);
      }
    } else if (this.opponentTop.archetype === 'defense') {
      const toCenter = (this.engine?.arena.center || new Vector2(0, 0)).clone().sub(this.opponentTop.position);
      toCenter.normalize().scale(60 * dt);
      this.opponentTop.applyForce(toCenter);
    }
  }

  /**
   * Evaluates win/loss via WinnerDetermination.
   * @private
   */
  _checkRoundFinish() {
    if (!this.playerTop || !this.opponentTop) return;

    const evaluation = WinnerDetermination.evaluate(this.playerTop, this.opponentTop);
    if (!evaluation.isOver) return;

    this._resolveRound(evaluation);
  }

  /**
   * Resolves round scoring and checks if current tournament match is complete.
   * @param {Object} evaluation
   * @private
   */
  _resolveRound(evaluation) {
    this.state = TOURNAMENT_STATES.ROUND_OVER;

    if (evaluation.isDraw) {
      // Replay round
    } else if (evaluation.winner === this.playerTop) {
      this.playerScore += evaluation.points;
    } else if (evaluation.winner === this.opponentTop) {
      this.opponentScore += evaluation.points;
    }

    const match = this._getCurrentPlayerMatch();
    if (match) {
      match.score = [this.playerScore, this.opponentScore];
    }

    const matchWon = this.playerScore >= this.pointsToWin;
    const matchLost = this.opponentScore >= this.pointsToWin;
    const isMatchOver = matchWon || matchLost;

    let progressionResult = null;

    if (isMatchOver) {
      this.state = TOURNAMENT_STATES.MATCH_OVER;
      if (match) {
        match.winner = matchWon ? match.p1 : match.p2;
      }

      if (matchWon) {
        // Simulate non-player AI matches in current tier
        this._simulateAiTierMatches();

        // Check if tournament is won
        if (this.tierIndex === 2) {
          // Player won Grand Finals!
          this.champion = match.p1;
          this.isPlayerChampion = true;
          this.state = TOURNAMENT_STATES.TOURNAMENT_OVER;

          if (this.progression) {
            // Champion grand prize
            progressionResult = this.progression.recordMatchResult(true, 10);
            this.progression.profile.credits += 300;
            this.progression.profile.xp += 250;
            this.progression.save();
          }
        } else {
          // Advance to next tier
          this._advanceToNextTier();
          if (this.progression) {
            progressionResult = this.progression.recordMatchResult(true, 4);
          }
        }
      } else {
        // Player eliminated from tournament
        this.state = TOURNAMENT_STATES.TOURNAMENT_OVER;
        this.isPlayerChampion = false;
        if (this.progression) {
          progressionResult = this.progression.recordMatchResult(false, 3);
        }
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
      isTournamentOver: this.state === TOURNAMENT_STATES.TOURNAMENT_OVER,
      isChampion: this.isPlayerChampion,
      tierName: this.roundNames[this.tierIndex],
      nextTierName: this.roundNames[this.tierIndex + 1] || null,
      bracket: this.bracket,
      progressionResult,
    });
  }

  /**
   * Advance bracket to next round after match victory.
   * @private
   */
  _advanceToNextTier() {
    const nextTier = this.tierIndex + 1;
    const currentTierMatches = this.bracket[this.tierIndex];
    const nextTierMatches = this.bracket[nextTier];

    if (!nextTierMatches) return;

    for (let i = 0; i < nextTierMatches.length; i++) {
      const matchA = currentTierMatches[i * 2];
      const matchB = currentTierMatches[i * 2 + 1];

      nextTierMatches[i].p1 = matchA ? matchA.winner : null;
      nextTierMatches[i].p2 = matchB ? matchB.winner : null;
      nextTierMatches[i].isPlayerMatch = Boolean(
        nextTierMatches[i].p1?.isPlayer || nextTierMatches[i].p2?.isPlayer
      );
    }

    this.tierIndex = nextTier;
  }

  /**
   * Simulate AI vs AI matches in current tier realistically.
   * @private
   */
  _simulateAiTierMatches() {
    const tierMatches = this.bracket[this.tierIndex];
    if (!tierMatches) return;

    for (const match of tierMatches) {
      if (match.isPlayerMatch || match.winner) continue;

      // Realistic random simulation based on archetype
      const p1Advantage = Math.random() > 0.48;
      const winner = p1Advantage ? match.p1 : match.p2;
      const loserScore = Math.floor(Math.random() * 2);

      match.score = p1Advantage ? [2, loserScore] : [loserScore, 2];
      match.winner = winner;
    }
  }

  /**
   * Advance to next round or next match.
   */
  nextRound() {
    if (this.state === TOURNAMENT_STATES.TOURNAMENT_OVER) {
      this.start();
    } else if (this.state === TOURNAMENT_STATES.MATCH_OVER) {
      this._prepareCurrentMatch();
    } else {
      this.currentRoundInMatch++;
      this._prepareCurrentMatch();
    }
  }

  teardown() {
    if (this.engine) {
      this.engine.clearTops();
    }
    this.playerTop = null;
    this.opponentTop = null;
  }
}

