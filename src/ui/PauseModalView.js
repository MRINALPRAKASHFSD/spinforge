/**
 * SPINFORGE - PauseModalView
 * In-game pause menu with resume, restart, workshop access, and controls reference.
 */

export class PauseModalView {
  /**
   * @param {HTMLElement} container
   * @param {Object} callbacks
   * @param {() => void} callbacks.onResume
   * @param {() => void} callbacks.onRestart
   * @param {() => void} callbacks.onOpenWorkshop
   */
  constructor(container, callbacks = {}) {
    this.container = container;
    this.callbacks = callbacks;

    this.root = document.createElement('div');
    this.root.className = 'spinforge-pause-overlay hidden';
    this.container.appendChild(this.root);

    this.isPaused = false;
    this._buildElements();
  }

  _buildElements() {
    this.root.innerHTML = `
      <div class="pause-card">
        <div class="pause-header">
          <h2>⏸️ GAME PAUSED</h2>
          <span class="pause-subtitle">TACTICAL TIMEOUT</span>
        </div>

        <div class="pause-actions">
          <button class="pause-btn primary" id="pause-resume-btn">RESUME BATTLE</button>
          <button class="pause-btn secondary" id="pause-restart-btn">RESTART ROUND</button>
          <button class="pause-btn secondary" id="pause-forge-btn">⚡ WORKSHOP / GARAGE</button>
        </div>

        <div class="controls-guide">
          <h4>SYSTEM CONTROLS</h4>
          <div class="guide-row">
            <span class="key-badge">SPACE / CLICK</span>
            <span class="guide-desc">Charge & Pull Rip-cord</span>
          </div>
          <div class="guide-row">
            <span class="key-badge">DRAG / SLIDER</span>
            <span class="guide-desc">Aim Launch Trajectory</span>
          </div>
          <div class="guide-row">
            <span class="key-badge">ESC / P</span>
            <span class="guide-desc">Pause / Resume Simulation</span>
          </div>
          <div class="guide-row">
            <span class="key-badge">R</span>
            <span class="guide-desc">Quick Round Reset</span>
          </div>
        </div>
      </div>
    `;

    this.resumeBtn = this.root.querySelector('#pause-resume-btn');
    this.restartBtn = this.root.querySelector('#pause-restart-btn');
    this.forgeBtn = this.root.querySelector('#pause-forge-btn');

    this._bindEvents();
  }

  _bindEvents() {
    this.resumeBtn.addEventListener('click', () => {
      this.hide();
      if (this.callbacks.onResume) this.callbacks.onResume();
    });

    this.restartBtn.addEventListener('click', () => {
      this.hide();
      if (this.callbacks.onRestart) this.callbacks.onRestart();
    });

    this.forgeBtn.addEventListener('click', () => {
      this.hide();
      if (this.callbacks.onOpenWorkshop) this.callbacks.onOpenWorkshop();
    });
  }

  show() {
    this.isPaused = true;
    this.root.classList.remove('hidden');
  }

  hide() {
    this.isPaused = false;
    this.root.classList.add('hidden');
  }

  toggle() {
    if (this.isPaused) {
      this.hide();
      if (this.callbacks.onResume) this.callbacks.onResume();
    } else {
      this.show();
    }
  }
}

