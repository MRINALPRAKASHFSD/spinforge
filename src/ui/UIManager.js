/**
 * SPINFORGE - UIManager
 * Central UI orchestrator integrating HUD, launcher controls, modals, workshop, tournament, and pause menus.
 */

import { HUDView } from './HUDView.js';
import { LaunchGaugeView } from './LaunchGaugeView.js';
import { ModalView } from './ModalView.js';
import { ForgeView } from './ForgeView.js';
import { TournamentView } from './TournamentView.js';
import { PauseModalView } from './PauseModalView.js';

export class UIManager {
  /**
   * @param {HTMLElement} rootContainer
   * @param {Object} context
   * @param {import('../input/LaunchController.js').LaunchController} context.launchController
   * @param {import('../progression/ProgressionManager.js').ProgressionManager} context.progression
   * @param {(modeId: string) => void} context.onSelectMode
   * @param {() => void} context.onReloadLoadout
   * @param {() => void} [context.onPauseToggle]
   * @param {() => void} [context.onRestartMatch]
   */
  constructor(rootContainer, context) {
    this.container = rootContainer;
    this.context = context;

    this._buildHeader();

    this.hud = new HUDView(this.container);
    this.launcher = new LaunchGaugeView(this.container, context.launchController);
    this.modal = new ModalView(this.container);

    this.forge = new ForgeView(this.container, context.progression, () => {
      if (context.onReloadLoadout) context.onReloadLoadout();
      this.hud.showBanner('LOADOUT EQUIPPED', 'Top updated for battle!', 1800);
      this.updatePlayerBadge();
    });

    this.tournament = new TournamentView(
      this.container,
      () => {
        // Start next tournament match
        if (context.onStartTournamentMatch) {
          context.onStartTournamentMatch();
        }
      },
      () => {
        // Reset tournament
        if (context.onResetTournament) {
          context.onResetTournament();
        }
      }
    );

    this.pause = new PauseModalView(this.container, {
      onResume: () => {
        if (this.context.onResume) this.context.onResume();
      },
      onRestart: () => {
        if (this.context.onRestartMatch) this.context.onRestartMatch();
      },
      onOpenWorkshop: () => {
        this.forge.show();
      },
    });

    this._bindHeaderEvents();
    this._bindCanvasTouchAim();
    this.updatePlayerBadge();
  }

  _buildHeader() {
    const header = document.createElement('header');
    header.className = 'spinforge-header';
    header.innerHTML = `
      <div class="logo-area">
        <h1 class="game-logo">SPIN<span>FORGE</span></h1>
        <span class="game-tag">v0.1.0 ARCHITECTURE</span>
      </div>

      <nav class="mode-nav">
        <button class="nav-btn active" data-mode="battle">BATTLE</button>
        <button class="nav-btn" data-mode="tournament">TOURNAMENT</button>
        <button class="nav-btn" data-mode="practice">TRAINING</button>
        <button class="nav-btn" data-mode="survival">SURVIVAL</button>
      </nav>

      <div class="header-right">
        <button class="bracket-btn hidden" id="open-bracket-btn">🏆 BRACKET</button>
        <button class="forge-btn" id="open-forge-btn">⚡ WORKSHOP</button>
        <button class="pause-header-btn" id="header-pause-btn" title="Pause Game (Esc/P)">⏸️</button>
        <div class="player-badge">
          <span class="player-lvl" id="header-lvl">LVL 1</span>
          <span class="player-credits" id="header-credits">250 CR</span>
        </div>
      </div>
    `;
    this.container.prepend(header);
    this.header = header;

    this.bracketBtn = header.querySelector('#open-bracket-btn');
    this.pauseHeaderBtn = header.querySelector('#header-pause-btn');
  }

  _bindHeaderEvents() {
    const navButtons = this.header.querySelectorAll('.nav-btn');
    navButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        navButtons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const mode = btn.dataset.mode;

        // Show bracket button only in tournament mode
        if (this.bracketBtn) {
          if (mode === 'tournament') {
            this.bracketBtn.classList.remove('hidden');
          } else {
            this.bracketBtn.classList.add('hidden');
          }
        }

        if (this.context.onSelectMode) {
          this.context.onSelectMode(mode);
        }
      });
    });

    const openForgeBtn = this.header.querySelector('#open-forge-btn');
    openForgeBtn.addEventListener('click', () => {
      this.forge.show();
    });

    if (this.bracketBtn) {
      this.bracketBtn.addEventListener('click', () => {
        if (this.context.onOpenBracket) {
          this.context.onOpenBracket();
        } else {
          this.tournament.show();
        }
      });
    }

    if (this.pauseHeaderBtn) {
      this.pauseHeaderBtn.addEventListener('click', () => {
        if (this.context.onPauseToggle) {
          this.context.onPauseToggle();
        } else {
          this.pause.toggle();
        }
      });
    }
  }

  /**
   * Binds pointer / touch drag on the canvas to orient rip-cord aim trajectory.
   * @private
   */
  _bindCanvasTouchAim() {
    const canvas = this.container.querySelector('canvas') || document.querySelector('#game-canvas');
    if (!canvas) return;

    let isAimDragging = false;

    const updateAimFromPointer = (clientX, clientY) => {
      if (this.context.launchController.state !== 'READY') return;

      const rect = canvas.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      // Pointer direction relative to center of canvas
      const px = clientX - cx;
      const py = clientY - cy;

      // Compute angle pointing towards pointer or inward
      let rad = Math.atan2(py, px);
      if (rad > 0) rad = -rad; // Keep aimed toward stadium bowl

      this.context.launchController.setAimAngle(rad);

      // Update slider in launch gauge view
      const deg = Math.round((rad * 180) / Math.PI);
      if (this.launcher.angleSlider) {
        this.launcher.angleSlider.value = deg;
      }
      if (this.launcher.angleVal) {
        this.launcher.angleVal.textContent = `${deg}°`;
      }
    };

    canvas.addEventListener('pointerdown', (e) => {
      if (this.context.launchController.state === 'READY') {
        isAimDragging = true;
        updateAimFromPointer(e.clientX, e.clientY);
      }
    });

    window.addEventListener('pointermove', (e) => {
      if (isAimDragging) {
        updateAimFromPointer(e.clientX, e.clientY);
      }
    });

    window.addEventListener('pointerup', () => {
      isAimDragging = false;
    });
  }

  /**
   * Highlight active nav button when mode is switched programmatically.
   * @param {string} modeId
   */
  setActiveMode(modeId) {
    const navButtons = this.header.querySelectorAll('.nav-btn');
    navButtons.forEach((btn) => {
      if (btn.dataset.mode === modeId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    if (this.bracketBtn) {
      if (modeId === 'tournament') {
        this.bracketBtn.classList.remove('hidden');
      } else {
        this.bracketBtn.classList.add('hidden');
      }
    }
  }

  updatePlayerBadge() {
    const p = this.context.progression.profile;
    const elLvl = this.header.querySelector('#header-lvl');
    const elCr = this.header.querySelector('#header-credits');
    if (elLvl) elLvl.textContent = `LVL ${p.level}`;
    if (elCr) elCr.textContent = `${p.credits} CR`;
  }

  /**
   * Per-frame UI update.
   * @param {import('../engine/SpinningTop.js').SpinningTop | null} p1
   * @param {import('../engine/SpinningTop.js').SpinningTop | null} cpu
   * @param {Object} [telemetry]
   */
  update(p1, cpu, telemetry) {
    this.hud.updateGauges(p1, cpu, telemetry);
    this.launcher.update();
  }
}
