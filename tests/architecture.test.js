/**
 * SPINFORGE - Architecture & Import Integrity Tests
 * Verifies that all modules load without runtime errors or circular dependency locks.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

describe('Architecture & Module Integrity', () => {
  test('Engine module exports are complete and defined', async () => {
    const engineModule = await import('../src/engine/index.js');
    assert.ok(engineModule.Vector2, 'Vector2 must be exported');
    assert.ok(engineModule.Arena, 'Arena must be exported');
    assert.ok(engineModule.SpinningTop, 'SpinningTop must be exported');
    assert.ok(engineModule.PhysicsWorld, 'PhysicsWorld must be exported');
    assert.ok(engineModule.GameLoop, 'GameLoop must be exported');
    assert.ok(engineModule.GameEngine, 'GameEngine must be exported');
    assert.ok(engineModule.WinnerDetermination, 'WinnerDetermination must be exported');
    assert.ok(engineModule.BattleSimulation, 'BattleSimulation must be exported');
    assert.ok(engineModule.TICK_RATE, 'TICK_RATE constant must be exported');
    assert.ok(engineModule.FINISH_TYPES, 'FINISH_TYPES must be exported');
  });

  test('Rendering module exports are complete and defined', async () => {
    const renderingModule = await import('../src/rendering/index.js');
    assert.ok(renderingModule.Renderer, 'Renderer must be exported');
    assert.ok(renderingModule.Camera, 'Camera must be exported');
    assert.ok(renderingModule.ParticleSystem, 'ParticleSystem must be exported');
    assert.ok(renderingModule.ArenaRenderer, 'ArenaRenderer must be exported');
    assert.ok(renderingModule.TopRenderer, 'TopRenderer must be exported');
    assert.ok(renderingModule.CanvasRenderer, 'CanvasRenderer must be exported');
  });

  test('Input module exports are complete and defined', async () => {
    const inputModule = await import('../src/input/index.js');
    assert.ok(inputModule.InputManager, 'InputManager must be exported');
    assert.ok(inputModule.LaunchController, 'LaunchController must be exported');
    assert.ok(inputModule.LAUNCH_STATES, 'LAUNCH_STATES must be exported');
  });

  test('Modes module exports are complete and defined', async () => {
    const modesModule = await import('../src/modes/index.js');
    assert.ok(modesModule.GameMode, 'GameMode must be exported');
    assert.ok(modesModule.BattleMode, 'BattleMode must be exported');
    assert.ok(modesModule.PracticeMode, 'PracticeMode must be exported');
    assert.ok(modesModule.SurvivalMode, 'SurvivalMode must be exported');
    assert.ok(modesModule.TournamentMode, 'TournamentMode must be exported');
    assert.ok(modesModule.TOURNAMENT_STATES, 'TOURNAMENT_STATES must be exported');
    assert.ok(modesModule.ModeManager, 'ModeManager must be exported');
    assert.ok(modesModule.BATTLE_STATES, 'BATTLE_STATES must be exported');
  });

  test('Progression module exports are complete and defined', async () => {
    const progressionModule = await import('../src/progression/index.js');
    assert.ok(Array.isArray(progressionModule.LAYERS), 'LAYERS array must be exported');
    assert.ok(Array.isArray(progressionModule.DISCS), 'DISCS array must be exported');
    assert.ok(Array.isArray(progressionModule.DRIVERS), 'DRIVERS array must be exported');
    assert.ok(progressionModule.TopBuilder, 'TopBuilder must be exported');
    assert.ok(progressionModule.ProgressionManager, 'ProgressionManager must be exported');
  });

  test('UI module exports are complete and defined', async () => {
    const uiModule = await import('../src/ui/index.js');
    assert.ok(uiModule.HUDView, 'HUDView must be exported');
    assert.ok(uiModule.LaunchGaugeView, 'LaunchGaugeView must be exported');
    assert.ok(uiModule.ModalView, 'ModalView must be exported');
    assert.ok(uiModule.ForgeView, 'ForgeView must be exported');
    assert.ok(uiModule.TournamentView, 'TournamentView must be exported');
    assert.ok(uiModule.PauseModalView, 'PauseModalView must be exported');
    assert.ok(uiModule.UIManager, 'UIManager must be exported');
  });

  test('Main entry point exports bootstrapApplication function', async () => {
    const mainModule = await import('../src/main.js');
    assert.strictEqual(typeof mainModule.bootstrapApplication, 'function');
  });
});
