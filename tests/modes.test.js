/**
 * SPINFORGE - Game Modes & Lifecycle Tests
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine } from '../src/engine/GameEngine.js';
import { ProgressionManager } from '../src/progression/ProgressionManager.js';
import { ModeManager } from '../src/modes/ModeManager.js';
import { BattleMode, BATTLE_STATES } from '../src/modes/BattleMode.js';
import { PracticeMode } from '../src/modes/PracticeMode.js';
import { SurvivalMode } from '../src/modes/SurvivalMode.js';
import { TournamentMode, TOURNAMENT_STATES } from '../src/modes/TournamentMode.js';
import { Vector2 } from '../src/engine/Vector2.js';

describe('Modes: ModeManager & Lifecycle', () => {
  test('ModeManager registers and switches modes', () => {
    const engine = new GameEngine();
    const progression = new ProgressionManager();
    const manager = new ModeManager(engine, progression);

    const battle = manager.setMode('battle');
    assert.ok(battle instanceof BattleMode);
    assert.strictEqual(manager.activeMode.id, 'battle');

    const tournament = manager.setMode('tournament');
    assert.ok(tournament instanceof TournamentMode);
    assert.strictEqual(manager.activeMode.id, 'tournament');

    const practice = manager.setMode('practice');
    assert.ok(practice instanceof PracticeMode);
    assert.strictEqual(manager.activeMode.id, 'practice');

    const survival = manager.setMode('survival');
    assert.ok(survival instanceof SurvivalMode);
    assert.strictEqual(manager.activeMode.id, 'survival');
  });

  test('BattleMode prepares round entities and handles launch', () => {
    const engine = new GameEngine();
    const progression = new ProgressionManager();
    const battle = new BattleMode();
    battle.init(engine, progression);

    battle.start();
    assert.strictEqual(battle.state, BATTLE_STATES.READY_TO_LAUNCH);
    assert.ok(battle.playerTop);
    assert.ok(battle.opponentTop);

    // Launch player top
    battle.launch({
      position: new Vector2(0, -100),
      velocity: new Vector2(50, 0),
      rpm: 8000,
    });

    assert.strictEqual(battle.state, BATTLE_STATES.IN_BATTLE);
    assert.strictEqual(battle.playerTop.isAlive, true);
    assert.strictEqual(battle.opponentTop.isAlive, true);
  });

  test('TournamentMode generates 8-competitor bracket and advances across matches', () => {
    const engine = new GameEngine();
    const progression = new ProgressionManager();
    const tournament = new TournamentMode();
    tournament.init(engine, progression);

    tournament.start();
    assert.strictEqual(tournament.bracket.length, 3, 'Should have 3 tiers (QF, SF, Finals)');
    assert.strictEqual(tournament.bracket[0].length, 4, 'Quarterfinals should have 4 matches');
    assert.strictEqual(tournament.bracket[1].length, 2, 'Semifinals should have 2 matches');
    assert.strictEqual(tournament.bracket[2].length, 1, 'Finals should have 1 match');

    assert.strictEqual(tournament.state, TOURNAMENT_STATES.READY_TO_LAUNCH);
    assert.ok(tournament.playerTop);
    assert.ok(tournament.opponentTop);

    // Launch match
    tournament.launch({
      position: new Vector2(0, -100),
      velocity: new Vector2(50, 0),
      rpm: 8000,
    });
    assert.strictEqual(tournament.state, TOURNAMENT_STATES.IN_BATTLE);

    // Simulate player scoring 2 points to win QF
    tournament._resolveRound({
      isOver: true,
      isDraw: false,
      winner: tournament.playerTop,
      points: 2,
      finishType: 'BURST_FINISH',
      reason: 'Burst finish scored',
    });

    assert.strictEqual(tournament.state, TOURNAMENT_STATES.MATCH_OVER);
    assert.strictEqual(tournament.bracket[0][0].winner, tournament.bracket[0][0].p1);
    assert.strictEqual(tournament.tierIndex, 1, 'Should have advanced to Semifinals');
    assert.ok(tournament.bracket[1][0].p1, 'Semifinal 1 player should be populated');
  });
});
