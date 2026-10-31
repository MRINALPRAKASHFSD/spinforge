/**
 * SPINFORGE - Main Entry Point
 * Complete End-to-End Game System Integration.
 * Bootstraps the engine, renderer, input systems, progression, game modes, and responsive UI.
 */

import { Arena } from './engine/Arena.js';
import { GameEngine } from './engine/GameEngine.js';
import { Renderer } from './rendering/Renderer.js';
import { CanvasRenderer } from './rendering/CanvasRenderer.js';
import { InputManager } from './input/InputManager.js';
import { LaunchController } from './input/LaunchController.js';
import { ProgressionManager } from './progression/ProgressionManager.js';
import { ModeManager } from './modes/ModeManager.js';
import { UIManager } from './ui/UIManager.js';

export function bootstrapApplication() {
  console.log('🚀 Initializing SPINFORGE End-to-End Game Architecture...');

  // 1. Locate DOM mounts
  const appContainer = document.getElementById('app') || document.body;
  const canvas = document.getElementById('game-canvas');
  if (!canvas) {
    throw new Error('Canvas element #game-canvas not found in document.');
  }

  // 2. Instantiate Engine & Arena
  const arena = new Arena();
  const engine = new GameEngine({ arena });

  // 3. Instantiate Unified Renderer (also keeping CanvasRenderer export intact)
  const renderer = new Renderer(canvas, arena);

  // 4. Instantiate Input & Launch Controller
  const input = new InputManager(window);
  const launcher = new LaunchController({
    stadiumRadius: arena.radius,
    chargeSpeed: 2.5,
  });

  // 5. Instantiate Progression & Persistence
  const progression = new ProgressionManager();

  // 6. Instantiate Game Modes (Battle, Tournament, Practice, Survival)
  const modeManager = new ModeManager(engine, progression);

  // Pause / Resume helper
  const togglePause = () => {
    if (engine.loop.isPaused) {
      engine.resume();
      if (ui?.pause) ui.pause.hide();
      if (ui?.hud) ui.hud.showBanner('SIMULATION RESUMED', '', 900);
    } else {
      engine.pause();
      if (ui?.pause) ui.pause.show();
    }
  };

  const restartCurrentMatch = () => {
    if (modeManager.activeMode) {
      modeManager.activeMode.start();
      launcher.reset();
      if (ui?.launcher) ui.launcher.reset();
    }
    if (engine.loop.isPaused) {
      engine.resume();
    }
    if (ui?.pause) ui.pause.hide();
  };

  // 7. Instantiate User Interface with full callbacks
  const ui = new UIManager(appContainer, {
    launchController: launcher,
    progression,
    onSelectMode: (modeId) => {
      modeManager.setMode(modeId);
      launcher.reset();
      ui.launcher.reset();
      ui.setActiveMode(modeId);

      if (modeId === 'tournament') {
        const tourneyMode = modeManager.activeMode;
        if (tourneyMode && tourneyMode.bracket) {
          ui.tournament.show(tourneyMode.bracket, tourneyMode.tierIndex);
        }
      }
    },
    onReloadLoadout: () => {
      if (modeManager.activeMode) {
        modeManager.activeMode.start();
        launcher.reset();
        ui.launcher.reset();
      }
    },
    onPauseToggle: togglePause,
    onResume: () => {
      engine.resume();
      ui.pause.hide();
    },
    onRestartMatch: restartCurrentMatch,
    onOpenBracket: () => {
      if (modeManager.activeMode && modeManager.activeMode.id === 'tournament') {
        const tMode = modeManager.activeMode;
        ui.tournament.show(tMode.bracket, tMode.tierIndex);
      }
    },
    onStartTournamentMatch: () => {
      launcher.reset();
      ui.launcher.reset();
    },
    onResetTournament: () => {
      if (modeManager.activeMode && modeManager.activeMode.id === 'tournament') {
        modeManager.activeMode.start();
        const tMode = modeManager.activeMode;
        ui.tournament.update(tMode.bracket, tMode.tierIndex);
      }
    },
  });

  // 8. Wire Physics & Visual Effects via Unified Renderer Interface
  engine.onEvent((event) => {
    if (event.type === 'top_collision') {
      const normal = event.topB.position.clone().sub(event.topA.position).normalize();
      renderer.triggerImpact(event.contactPoint, normal, event.impulse, event.isHardImpact);
    } else if (event.type === 'burst_finish') {
      renderer.triggerBurst(
        event.victim.position,
        event.victim.primaryColor,
        event.victim.accentColor
      );
    } else if (event.type === 'wall_hit') {
      renderer.triggerWallHit(event.top.position, event.normal, event.impactSpeed);
    }
  });

  // 9. Wire Mode Events to UI & Lifecycle
  const bindModeEvents = (mode) => {
    mode.onEvent((event) => {
      // Round Prepared
      if (event.type === 'round_prepared') {
        ui.hud.updateScore(event.playerScore, event.opponentScore, event.round);
        const subtitle = event.tierName
          ? `${event.tierName.toUpperCase()} • PULL THE RIP-CORD!`
          : 'PULL THE RIP-CORD!';
        ui.hud.showBanner(`ROUND ${event.round}`, subtitle, 1600);
        launcher.reset();
        ui.launcher.reset();
      }

      // Battle Started
      else if (event.type === 'battle_started') {
        const subtitle = event.tierName ? `${event.tierName} Match` : 'CLASH OF THE BLADES';
        ui.hud.showBanner('LET IT RIP!', subtitle, 1200);
      }

      // Tournament Specific Events
      else if (event.type === 'tournament_started') {
        ui.tournament.update(event.bracket, event.currentTier);
        ui.tournament.show(event.bracket, event.currentTier);
      }

      // Survival Gauntlet Events
      else if (event.type === 'survival_ready' || event.type === 'wave_started') {
        ui.hud.showBanner(`WAVE ${event.wave}`, 'SURVIVE THE GAUNTLET!', 1600);
        launcher.reset();
        ui.launcher.reset();
      } else if (event.type === 'survival_game_over') {
        const waves = event.wavesCleared;
        const rewards = progression.recordMatchResult(waves >= 2, waves * 2);
        ui.modal.show(
          {
            title: 'GAUNTLET OVER',
            subtitle: `You survived ${waves} wave${waves === 1 ? '' : 's'}!`,
            score: `Wave ${waves + 1}`,
            buttonText: 'TRY AGAIN',
            rewards,
          },
          () => {
            mode.start();
            ui.updatePlayerBadge();
          }
        );
      }

      // Practice Sandbox Events
      else if (event.type === 'practice_ready') {
        ui.hud.showBanner('TRAINING LAB', 'Test loadouts and angles freely', 2000);
        launcher.reset();
        ui.launcher.reset();
      }

      // Standard / Tournament Round Ended
      else if (event.type === 'round_ended') {
        const isPlayerWin = event.winner === 'player';
        const isDraw = event.isDraw;

        // Tournament special handling
        if (mode.id === 'tournament') {
          ui.tournament.update(event.bracket, mode.tierIndex);

          if (event.isTournamentOver) {
            const title = event.isChampion ? '🏆 CHAMPION!' : 'ELIMINATED';
            const subtitle = event.isChampion
              ? 'CONGRATULATIONS! YOU CONQUERED THE TOURNAMENT!'
              : `Defeated in ${event.tierName}`;
            const scoreStr = `${event.playerScore} - ${event.opponentScore}`;

            ui.modal.show(
              {
                title,
                subtitle,
                score: scoreStr,
                buttonText: 'NEW TOURNAMENT',
                rewards: event.progressionResult,
              },
              () => {
                mode.start();
                ui.tournament.show(mode.bracket, mode.tierIndex);
                ui.updatePlayerBadge();
              }
            );
            return;
          } else if (event.isMatchOver) {
            const title = event.matchWon ? 'MATCH VICTORY!' : 'MATCH DEFEAT';
            const subtitle = `Advanced to ${event.nextTierName || 'Next Round'}`;
            const scoreStr = `${event.playerScore} - ${event.opponentScore}`;

            ui.modal.show(
              {
                title,
                subtitle,
                score: scoreStr,
                buttonText: 'VIEW BRACKET',
                rewards: event.progressionResult,
              },
              () => {
                mode.nextRound();
                ui.tournament.show(mode.bracket, mode.tierIndex);
                ui.updatePlayerBadge();
              }
            );
            return;
          }
        }

        // Standard 1v1 Battle handling
        const title = event.isMatchOver
          ? isPlayerWin ? '🏆 VICTORY!' : 'DEFEAT'
          : isDraw ? '⚖️ DRAW!' : (isPlayerWin ? 'POINT SCORED!' : 'ROUND LOST');

        const subtitle = isDraw
          ? `SIMULTANEOUS ${event.reason.replace('SIMULTANEOUS_', '')} (REPLAY)`
          : `${event.finishType.replace('_', ' ')} (+${event.points} PTS)`;
        const scoreStr = `${event.playerScore} - ${event.opponentScore}`;

        ui.modal.show(
          {
            title,
            subtitle,
            score: scoreStr,
            buttonText: event.isMatchOver ? 'REMATCH' : (isDraw ? 'REPLAY ROUND' : 'NEXT ROUND'),
            rewards: event.progressionResult,
          },
          () => {
            mode.nextRound();
            ui.updatePlayerBadge();
          }
        );
      }
    });
  };

  // Bind initial mode and future mode changes
  modeManager.onModeChange((newMode) => {
    bindModeEvents(newMode);
  });

  // 10. Wire Launcher & Input Actions
  launcher.onLaunch((launchData) => {
    if (modeManager.activeMode && typeof modeManager.activeMode.launch === 'function') {
      modeManager.activeMode.launch(launchData);
    }
  });

  input.onAction((action) => {
    if (action === 'launch') {
      ui.launcher.triggerLaunch();
    } else if (action === 'reset') {
      restartCurrentMatch();
    } else if (action === 'pause') {
      togglePause();
    }
  });

  // 11. Connect Engine Loop to Unified Renderer & UI
  engine.setRenderCallback((alpha, dt) => {
    // Update camera, arena shaders, and particles
    renderer.update(dt);

    // Update active game mode logic
    modeManager.update(dt);

    // Render frame with unified scene pipeline (tops + launch guide)
    const activeTops = engine.getTops();
    renderer.render({ tops: activeTops, launcher }, alpha);

    // Update UI telemetry and gauges
    const p1 = activeTops.find((t) => t.owner === 'player') || null;
    const cpu = activeTops.find((t) => t.owner === 'cpu' || t.owner === 'dummy') || null;
    launcher.update(dt);
    ui.update(p1, cpu, renderer.getTelemetry());
  });

  // 12. Boot into default Battle Mode & Start Engine
  const defaultMode = modeManager.setMode('battle');
  bindModeEvents(defaultMode);
  engine.start();

  console.log('✅ SPINFORGE complete game integration running successfully!');

  return {
    engine,
    renderer,
    input,
    launcher,
    progression,
    modeManager,
    ui,
  };
}

// Auto-run if loaded in browser
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => bootstrapApplication());
  } else {
    bootstrapApplication();
  }
}
