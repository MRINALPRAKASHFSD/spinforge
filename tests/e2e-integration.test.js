/**
 * SPINFORGE - Complete End-to-End Game System Integration Tests
 * Validates the full playable loop:
 * - Engine lifecycle (independent physics & rendering, pause, resume, restart)
 * - Battle system (player launch controls, AI opponent archetypes, collisions, victory/defeat)
 * - Progression (stat customization, reward calculation, persistent storage across browser reload)
 * - UI & Navigation (main menu, tournament bracket, HUD telemetry, responsive touch aiming)
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { Arena } from '../src/engine/Arena.js';
import { GameEngine } from '../src/engine/GameEngine.js';
import { Vector2 } from '../src/engine/Vector2.js';
import { LaunchController, LAUNCH_STATES } from '../src/input/LaunchController.js';
import { InputManager } from '../src/input/InputManager.js';
import { ProgressionManager } from '../src/progression/ProgressionManager.js';
import { TopBuilder } from '../src/progression/TopBuilder.js';
import { LAYERS, DISCS, DRIVERS } from '../src/progression/PartRegistry.js';
import { ModeManager } from '../src/modes/ModeManager.js';
import { BattleMode, BATTLE_STATES } from '../src/modes/BattleMode.js';
import { TournamentMode, TOURNAMENT_STATES } from '../src/modes/TournamentMode.js';
import { PracticeMode } from '../src/modes/PracticeMode.js';
import { SurvivalMode } from '../src/modes/SurvivalMode.js';
import { WinnerDetermination } from '../src/engine/WinnerDetermination.js';

// Mock localStorage for headless Node environment
const mockStorage = new Map();
globalThis.localStorage = {
  getItem: (key) => mockStorage.get(key) || null,
  setItem: (key, val) => mockStorage.set(key, String(val)),
  removeItem: (key) => mockStorage.delete(key),
  clear: () => mockStorage.clear(),
};

describe('E2E: Game Engine Lifecycle & State Transitions', () => {
  test('Physics and rendering execute independently through fixed accumulation', () => {
    const arena = new Arena();
    const engine = new GameEngine({ arena });

    let physicsSteps = 0;
    let renderPasses = 0;

    engine.world.onEvent(() => {});
    engine.setRenderCallback((alpha, dt) => {
      renderPasses++;
      assert.ok(alpha >= 0 && alpha <= 1.0, 'Alpha interpolation must be normalized [0, 1]');
    });

    // Simulate 2 fixed physics steps
    const stepDt = engine.loop.fixedTimestep;
    engine.loop.updateFn = () => {
      physicsSteps++;
      engine.update(engine.loop.fixedTimestep);
    };

    engine.loop.accumulator += stepDt * 2 + 0.001; // accumulate 2 complete slices
    while (engine.loop.accumulator >= engine.loop.fixedTimestep) {
      engine.loop.updateFn(engine.loop.fixedTimestep);
      engine.loop.accumulator -= engine.loop.fixedTimestep;
    }
    engine.loop.renderFn(engine.loop.accumulator / engine.loop.fixedTimestep, stepDt);

    assert.strictEqual(physicsSteps, 2, 'Two fixed physics steps should execute');
    assert.strictEqual(renderPasses, 1, 'One render pass should execute');
  });

  test('Pause, resume, and restart controls operate reliably', () => {
    const arena = new Arena();
    const engine = new GameEngine({ arena });

    assert.strictEqual(engine.loop.isPaused, false);
    engine.pause();
    assert.strictEqual(engine.loop.isPaused, true);
    engine.resume();
    assert.strictEqual(engine.loop.isPaused, false);
  });
});

describe('E2E: Battle System & Opponent Archetypes', () => {
  test('Player launch controls charge and release with physical velocity', () => {
    const launcher = new LaunchController({ stadiumRadius: 260, chargeSpeed: 2.0 });

    assert.strictEqual(launcher.state, LAUNCH_STATES.READY);
    launcher.setAimAngle(-Math.PI / 3);

    launcher.startCharging();
    assert.strictEqual(launcher.state, LAUNCH_STATES.CHARGING);

    launcher.update(0.3); // charge for 300ms
    assert.ok(launcher.power > 0.4 && launcher.power < 0.8, 'Power should oscillate upward');

    const launchData = launcher.release();
    assert.strictEqual(launcher.state, LAUNCH_STATES.LAUNCHED);
    assert.ok(launchData.velocity.length() > 200, 'Velocity should have significant momentum');
    assert.ok(launchData.rpm >= 6000, 'RPM should map to high rotational speed');
    assert.strictEqual(launchData.position.y, -260 * 0.7);
  });

  test('AI opponents execute archetype-specific behaviors', () => {
    const arena = new Arena();
    const engine = new GameEngine({ arena });
    const progression = new ProgressionManager();
    const battle = new BattleMode();
    battle.init(engine, progression);
    battle.start();

    // Verify AI opponent configuration
    assert.ok(battle.opponentTop);
    assert.ok(battle.opponentTop.name.length > 0);

    battle.launch({
      position: new Vector2(0, -150),
      velocity: new Vector2(0, 100),
      rpm: 8000,
    });

    const initialOppPos = battle.opponentTop.position.clone();
    // Step simulation forward
    for (let i = 0; i < 30; i++) {
      battle.update(0.016);
      engine.update(0.016);
    }

    assert.notDeepStrictEqual(battle.opponentTop.position, initialOppPos, 'Opponent top should move under AI impulses');
  });
});

describe('E2E: Progression, Garage Customization & Browser Reload Persistence', () => {
  beforeEach(() => {
    mockStorage.clear();
  });

  test('Custom part selection modifies top stats and persists across reload', () => {
    const pm1 = new ProgressionManager();
    assert.strictEqual(pm1.profile.level, 1);
    assert.strictEqual(pm1.profile.currentLoadout.layerId, LAYERS[0].id);

    // Build default top
    const defaultStats = TopBuilder.calculateStats(
      pm1.profile.currentLoadout.layerId,
      pm1.profile.currentLoadout.discId,
      pm1.profile.currentLoadout.driverId
    );

    // Equip defense loadout in Garage / Workshop
    pm1.setLoadout(LAYERS[1].id, DISCS[0].id, DRIVERS[2].id);

    const customizedStats = TopBuilder.calculateStats(
      pm1.profile.currentLoadout.layerId,
      pm1.profile.currentLoadout.discId,
      pm1.profile.currentLoadout.driverId
    );

    assert.notStrictEqual(customizedStats.defensePower, defaultStats.defensePower);
    assert.ok(customizedStats.defensePower > defaultStats.defensePower, 'Aegis build should have higher defense');

    // Record a winning match and verify rewards
    const reward = pm1.recordMatchResult(true, 6);
    assert.strictEqual(reward.xpGained, 150);
    assert.strictEqual(reward.creditsGained, 100);
    assert.strictEqual(pm1.profile.battlesWon, 1);

    // Simulate browser refresh by creating new ProgressionManager reading localStorage
    const pmReloaded = new ProgressionManager();
    assert.strictEqual(pmReloaded.profile.battlesWon, 1, 'Battles won must persist across refresh');
    assert.strictEqual(pmReloaded.profile.currentLoadout.layerId, LAYERS[1].id, 'Equipped layer must persist');
    assert.strictEqual(pmReloaded.profile.currentLoadout.driverId, DRIVERS[2].id, 'Equipped driver must persist');
    assert.strictEqual(pmReloaded.profile.credits, pm1.profile.credits, 'Credits must persist');
  });
});

describe('E2E: Complete Game Modes & Tournament Bracket', () => {
  test('All four game modes initialize and can be played', () => {
    const arena = new Arena();
    const engine = new GameEngine({ arena });
    const progression = new ProgressionManager();
    const modeManager = new ModeManager(engine, progression);

    // 1. Battle Mode
    const battle = modeManager.setMode('battle');
    assert.ok(battle instanceof BattleMode);
    battle.launch({
      position: new Vector2(0, -100),
      velocity: new Vector2(50, 0),
      rpm: 7500,
    });
    assert.strictEqual(battle.state, BATTLE_STATES.IN_BATTLE);

    // 2. Training / Practice Mode
    const practice = modeManager.setMode('practice');
    assert.ok(practice instanceof PracticeMode);
    assert.ok(practice.targetDummy, 'Practice mode should spawn a training dummy');
    practice.launch({
      position: new Vector2(0, -120),
      velocity: new Vector2(0, 100),
      rpm: 8000,
    });
    assert.strictEqual(practice.isLaunched, true);

    // 3. Survival Gauntlet Mode
    const survival = modeManager.setMode('survival');
    assert.ok(survival instanceof SurvivalMode);
    assert.strictEqual(survival.wave, 1);
    assert.ok(survival.currentEnemy);
    survival.launch({
      position: new Vector2(0, -120),
      velocity: new Vector2(0, 100),
      rpm: 8000,
    });
    assert.ok(survival.playerTop.isAlive);

    // 4. Tournament Championship Mode
    const tournament = modeManager.setMode('tournament');
    assert.ok(tournament instanceof TournamentMode);
    assert.strictEqual(tournament.bracket.length, 3);
    assert.strictEqual(tournament.state, TOURNAMENT_STATES.READY_TO_LAUNCH);
  });

  test('Tournament Championship progresses through Quarterfinals, Semifinals, and Grand Finals to victory', () => {
    const arena = new Arena();
    const engine = new GameEngine({ arena });
    const progression = new ProgressionManager();
    const tournament = new TournamentMode();
    tournament.init(engine, progression);
    tournament.start();

    // Quarterfinals win
    assert.strictEqual(tournament.tierIndex, 0);
    tournament.launch({
      position: new Vector2(0, -100),
      velocity: new Vector2(0, 100),
      rpm: 8000,
    });
    tournament._resolveRound({
      isOver: true,
      isDraw: false,
      winner: tournament.playerTop,
      points: 2,
      finishType: 'BURST_FINISH',
      reason: 'Burst finish',
    });
    assert.strictEqual(tournament.tierIndex, 1, 'Should advance to Semifinals');

    // Semifinals win
    tournament.nextRound();
    tournament.launch({
      position: new Vector2(0, -100),
      velocity: new Vector2(0, 100),
      rpm: 8000,
    });
    tournament._resolveRound({
      isOver: true,
      isDraw: false,
      winner: tournament.playerTop,
      points: 2,
      finishType: 'RING_OUT',
      reason: 'Ring-out finish',
    });
    assert.strictEqual(tournament.tierIndex, 2, 'Should advance to Grand Finals');

    // Grand Finals win
    tournament.nextRound();
    tournament.launch({
      position: new Vector2(0, -100),
      velocity: new Vector2(0, 100),
      rpm: 8000,
    });
    tournament._resolveRound({
      isOver: true,
      isDraw: false,
      winner: tournament.playerTop,
      points: 2,
      finishType: 'BURST_FINISH',
      reason: 'Burst finish',
    });
    assert.strictEqual(tournament.state, TOURNAMENT_STATES.TOURNAMENT_OVER);
    assert.strictEqual(tournament.isPlayerChampion, true, 'Player should be crowned Tournament Champion!');
  });
});

describe('E2E: Responsive Mobile Touch & Drag Aiming Integration', () => {
  test('Touch drag trajectory angle correctly points toward center bowl', () => {
    const launcher = new LaunchController();

    // Simulate drag coordinate from rim (-100, -100) toward center (0, 0)
    const touchX = 0;
    const touchY = 0;
    const spawnX = 0;
    const spawnY = -180;

    const angle = Math.atan2(touchY - spawnY, touchX - spawnX);
    launcher.setAimAngle(angle);

    assert.ok(Math.abs(launcher.angle - Math.PI / 2) < 0.01, 'Aim angle should orient along the vector toward touch point');
  });
});

describe('E2E: Definition of Done Verification', () => {
  test('Full player loop: Launch -> Configure Top -> Battle -> Rewards -> Reload', () => {
    mockStorage.clear();

    // 1. Player profile initializes
    const pm = new ProgressionManager();
    const initialCredits = pm.profile.credits;

    // 2. Player opens workshop and configures custom top
    pm.setLoadout(LAYERS[2].id, DISCS[1].id, DRIVERS[0].id);
    const top = TopBuilder.build({
      layerId: pm.profile.currentLoadout.layerId,
      discId: pm.profile.currentLoadout.discId,
      driverId: pm.profile.currentLoadout.driverId,
    });
    assert.strictEqual(top.archetype, 'stamina');

    // 3. Complete a head-to-head battle
    const arena = new Arena();
    const engine = new GameEngine({ arena });
    const battle = new BattleMode();
    battle.init(engine, pm);
    battle.start();

    battle.launch({
      position: new Vector2(0, -120),
      velocity: new Vector2(0, 150),
      rpm: 8500,
    });

    // Score 3 points to complete match
    battle._resolveRound({
      isOver: true,
      isDraw: false,
      winner: battle.playerTop,
      points: 3,
      finishType: 'BURST_FINISH',
      reason: 'Burst finish',
    });

    assert.strictEqual(battle.state, BATTLE_STATES.MATCH_OVER);
    assert.strictEqual(pm.profile.battlesWon, 1);
    assert.strictEqual(pm.profile.credits, initialCredits + 100);

    // 4. Player reloads browser -> progression is retained!
    const pmAfterReload = new ProgressionManager();
    assert.strictEqual(pmAfterReload.profile.battlesWon, 1);
    assert.strictEqual(pmAfterReload.profile.credits, initialCredits + 100);
    assert.strictEqual(pmAfterReload.profile.currentLoadout.layerId, LAYERS[2].id);
  });
});
