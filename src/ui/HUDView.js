/**
 * SPINFORGE - HUDView
 * Heads-up display for RPM tachometers, burst stability meters, match score,
 * live telemetry (FPS, frame time), and event banners.
 */

export class HUDView {
  /**
   * @param {HTMLElement} container
   */
  constructor(container) {
    this.container = container;
    this.root = document.createElement('div');
    this.root.className = 'spinforge-hud';
    this.container.appendChild(this.root);

    this._buildElements();
  }

  /**
   * Constructs DOM hierarchy.
   * @private
   */
  _buildElements() {
    this.root.innerHTML = `
      <div class="hud-top-bar">
        <!-- Player Gauge -->
        <div class="hud-player-gauge" id="hud-p1">
          <div class="top-info">
            <span class="top-name" id="hud-p1-name">VORTEX STRIKER</span>
            <span class="top-score" id="hud-p1-score">0</span>
          </div>
          <div class="stat-bars">
            <div class="gauge-label">RPM: <span id="hud-p1-rpm-val">0</span></div>
            <div class="bar-container">
              <div class="bar-fill rpm-fill" id="hud-p1-rpm-bar" style="width: 0%"></div>
            </div>
            <div class="gauge-label">STABILITY: <span id="hud-p1-burst-val">100%</span></div>
            <div class="bar-container">
              <div class="bar-fill burst-fill" id="hud-p1-burst-bar" style="width: 100%"></div>
            </div>
          </div>
        </div>

        <!-- Center Match Info -->
        <div class="hud-center-info">
          <div class="round-badge" id="hud-round-badge">ROUND 1</div>
          <div class="vs-text">VS</div>
          <div class="target-score">FIRST TO 3 PTS</div>
        </div>

        <!-- Opponent Gauge -->
        <div class="hud-player-gauge opponent-gauge" id="hud-cpu">
          <div class="top-info">
            <span class="top-score" id="hud-cpu-score">0</span>
            <span class="top-name" id="hud-cpu-name">APEX DESTROYER</span>
          </div>
          <div class="stat-bars">
            <div class="gauge-label">RPM: <span id="hud-cpu-rpm-val">0</span></div>
            <div class="bar-container">
              <div class="bar-fill rpm-fill cpu-rpm" id="hud-cpu-rpm-bar" style="width: 0%"></div>
            </div>
            <div class="gauge-label">STABILITY: <span id="hud-cpu-burst-val">100%</span></div>
            <div class="bar-container">
              <div class="bar-fill burst-fill cpu-burst" id="hud-cpu-burst-bar" style="width: 100%"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Banner Announcement -->
      <div class="hud-banner-overlay" id="hud-banner">
        <h2 class="banner-title" id="hud-banner-title">READY</h2>
        <p class="banner-subtitle" id="hud-banner-sub">PULL THE RIP-CORD!</p>
      </div>

      <!-- Live Performance Telemetry Tag -->
      <div class="hud-telemetry" id="hud-telemetry">
        <span class="telemetry-pill" id="hud-fps-pill">60 FPS</span>
        <span class="telemetry-pill" id="hud-ft-pill">1.0ms</span>
      </div>
    `;

    // Cache elements
    this.elP1Name = this.root.querySelector('#hud-p1-name');
    this.elP1Score = this.root.querySelector('#hud-p1-score');
    this.elP1RpmVal = this.root.querySelector('#hud-p1-rpm-val');
    this.elP1RpmBar = this.root.querySelector('#hud-p1-rpm-bar');
    this.elP1BurstVal = this.root.querySelector('#hud-p1-burst-val');
    this.elP1BurstBar = this.root.querySelector('#hud-p1-burst-bar');

    this.elCpuName = this.root.querySelector('#hud-cpu-name');
    this.elCpuScore = this.root.querySelector('#hud-cpu-score');
    this.elCpuRpmVal = this.root.querySelector('#hud-cpu-rpm-val');
    this.elCpuRpmBar = this.root.querySelector('#hud-cpu-rpm-bar');
    this.elCpuBurstVal = this.root.querySelector('#hud-cpu-burst-val');
    this.elCpuBurstBar = this.root.querySelector('#hud-cpu-burst-bar');

    this.elRoundBadge = this.root.querySelector('#hud-round-badge');
    this.elBanner = this.root.querySelector('#hud-banner');
    this.elBannerTitle = this.root.querySelector('#hud-banner-title');
    this.elBannerSub = this.root.querySelector('#hud-banner-sub');

    this.elFpsPill = this.root.querySelector('#hud-fps-pill');
    this.elFtPill = this.root.querySelector('#hud-ft-pill');
  }

  /**
   * Update real-time gauges and telemetry.
   * @param {import('../engine/SpinningTop.js').SpinningTop | null} p1
   * @param {import('../engine/SpinningTop.js').SpinningTop | null} cpu
   * @param {Object} [telemetry]
   * @param {number} [telemetry.fps]
   * @param {number} [telemetry.frameTimeMs]
   */
  updateGauges(p1, cpu, telemetry) {
    if (p1) {
      this.elP1Name.textContent = p1.name.toUpperCase();
      this.elP1RpmVal.textContent = Math.round(p1.rpm).toLocaleString();
      const p1RpmPct = Math.min(100, Math.round((p1.rpm / p1.maxRpm) * 100));
      this.elP1RpmBar.style.width = `${p1RpmPct}%`;

      const p1BurstPct = Math.min(100, Math.max(0, Math.round((p1.burstResistance / p1.maxBurstResistance) * 100)));
      this.elP1BurstBar.style.width = `${p1BurstPct}%`;
      this.elP1BurstVal.textContent = `${p1BurstPct}%`;

      if (p1BurstPct < 30) {
        this.elP1BurstBar.classList.add('danger-pulse');
      } else {
        this.elP1BurstBar.classList.remove('danger-pulse');
      }
    }

    if (cpu) {
      this.elCpuName.textContent = cpu.name.toUpperCase();
      this.elCpuRpmVal.textContent = Math.round(cpu.rpm).toLocaleString();
      const cpuRpmPct = Math.min(100, Math.round((cpu.rpm / cpu.maxRpm) * 100));
      this.elCpuRpmBar.style.width = `${cpuRpmPct}%`;

      const cpuBurstPct = Math.min(100, Math.max(0, Math.round((cpu.burstResistance / cpu.maxBurstResistance) * 100)));
      this.elCpuBurstBar.style.width = `${cpuBurstPct}%`;
      this.elCpuBurstVal.textContent = `${cpuBurstPct}%`;

      if (cpuBurstPct < 30) {
        this.elCpuBurstBar.classList.add('danger-pulse');
      } else {
        this.elCpuBurstBar.classList.remove('danger-pulse');
      }
    }

    if (telemetry) {
      if (this.elFpsPill && Number.isFinite(telemetry.fps)) {
        this.elFpsPill.textContent = `${telemetry.fps} FPS`;
      }
      if (this.elFtPill && Number.isFinite(telemetry.frameTimeMs)) {
        this.elFtPill.textContent = `${telemetry.frameTimeMs.toFixed(1)}ms`;
      }
    }
  }

  /**
   * Update scores and round indicator.
   * @param {number} p1Score
   * @param {number} cpuScore
   * @param {number} round
   */
  updateScore(p1Score, cpuScore, round) {
    this.elP1Score.textContent = p1Score;
    this.elCpuScore.textContent = cpuScore;
    this.elRoundBadge.textContent = `ROUND ${round}`;
  }

  /**
   * Show animated banner message.
   * @param {string} title
   * @param {string} subtitle
   * @param {number} durationMs
   */
  showBanner(title, subtitle = '', durationMs = 2200) {
    this.elBannerTitle.textContent = title;
    this.elBannerSub.textContent = subtitle;
    this.elBanner.classList.add('visible');

    if (this._bannerTimer) clearTimeout(this._bannerTimer);
    if (durationMs > 0) {
      this._bannerTimer = setTimeout(() => {
        this.elBanner.classList.remove('visible');
      }, durationMs);
    }
  }

  /**
   * Hide banner immediately.
   */
  hideBanner() {
    this.elBanner.classList.remove('visible');
  }
}
