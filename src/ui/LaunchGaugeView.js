/**
 * SPINFORGE - LaunchGaugeView
 * Interactive rip-cord launcher view with timing power meter and angle controls.
 */

export class LaunchGaugeView {
  /**
   * @param {HTMLElement} container
   * @param {import('../input/LaunchController.js').LaunchController} launchController
   */
  constructor(container, launchController) {
    this.container = container;
    this.controller = launchController;

    this.root = document.createElement('div');
    this.root.className = 'spinforge-launch-gauge';
    this.container.appendChild(this.root);

    this._buildElements();
  }

  _buildElements() {
    this.root.innerHTML = `
      <div class="launcher-panel">
        <div class="launcher-header">RIP-CORD LAUNCHER</div>
        
        <div class="meter-frame">
          <div class="sweet-spot-marker" title="Sweet Spot (85%-100%)"></div>
          <div class="power-meter-fill" id="launch-power-fill" style="width: 0%"></div>
        </div>

        <div class="power-percentage" id="launch-power-text">0% POWER</div>

        <div class="launcher-controls">
          <label class="angle-label">
            AIM: <input type="range" id="launch-angle-slider" min="-180" max="0" value="-90" />
            <span id="launch-angle-val">-90°</span>
          </label>
          <button class="launch-btn" id="launch-trigger-btn">PULL RIP-CORD (SPACE)</button>
        </div>
      </div>
    `;

    this.powerFill = this.root.querySelector('#launch-power-fill');
    this.powerText = this.root.querySelector('#launch-power-text');
    this.angleSlider = this.root.querySelector('#launch-angle-slider');
    this.angleVal = this.root.querySelector('#launch-angle-val');
    this.triggerBtn = this.root.querySelector('#launch-trigger-btn');

    this._bindEvents();
  }

  _bindEvents() {
    // Angle slider changes aim
    this.angleSlider.addEventListener('input', (e) => {
      const deg = parseFloat(e.target.value);
      this.angleVal.textContent = `${deg}°`;
      const rad = (deg * Math.PI) / 180;
      this.controller.setAimAngle(rad);
    });

    // Launch button triggers charge / release
    this.triggerBtn.addEventListener('click', () => {
      this.triggerLaunch();
    });
  }

  /**
   * Action trigger from button or Spacebar.
   */
  triggerLaunch() {
    if (this.controller.state === 'READY') {
      this.controller.startCharging();
      this.triggerBtn.textContent = 'RELEASE NOW!';
      this.triggerBtn.classList.add('charging');
    } else if (this.controller.state === 'CHARGING') {
      this.controller.release();
      this.triggerBtn.textContent = 'LAUNCHED';
      this.triggerBtn.classList.remove('charging');
      this.triggerBtn.disabled = true;
    }
  }

  /**
   * Reset launch view for next round.
   */
  reset() {
    this.controller.reset();
    this.triggerBtn.textContent = 'PULL RIP-CORD (SPACE)';
    this.triggerBtn.classList.remove('charging');
    this.triggerBtn.disabled = false;
    this.powerFill.style.width = '0%';
    this.powerText.textContent = '0% POWER';
  }

  /**
   * Frame update syncing power meter fill.
   */
  update() {
    if (this.controller.state === 'CHARGING') {
      const pct = Math.round(this.controller.power * 100);
      this.powerFill.style.width = `${pct}%`;
      this.powerText.textContent = `${pct}% POWER ${pct >= 85 ? '🔥 SWEET SPOT!' : ''}`;
    }
  }

  /**
   * Show or hide launch panel.
   * @param {boolean} visible
   */
  setVisible(visible) {
    this.root.style.display = visible ? 'flex' : 'none';
  }
}

