/**
 * SPINFORGE - ForgeView
 * Interactive top workshop for customizing Energy Layers, Weight Discs, and Drivers.
 */

import { LAYERS, DISCS, DRIVERS } from '../progression/PartRegistry.js';
import { TopBuilder } from '../progression/TopBuilder.js';

export class ForgeView {
  /**
   * @param {HTMLElement} container
   * @param {import('../progression/ProgressionManager.js').ProgressionManager} progression
   * @param {() => void} [onEquip]
   */
  constructor(container, progression, onEquip) {
    this.container = container;
    this.progression = progression;
    this.onEquip = onEquip;

    this.root = document.createElement('div');
    this.root.className = 'spinforge-forge-overlay hidden';
    this.container.appendChild(this.root);

    this.selectedLayer = progression.profile.currentLoadout.layerId;
    this.selectedDisc = progression.profile.currentLoadout.discId;
    this.selectedDriver = progression.profile.currentLoadout.driverId;

    this._buildElements();
  }

  _buildElements() {
    this.root.innerHTML = `
      <div class="forge-modal">
        <div class="forge-header">
          <h2>THE SPINFORGE WORKSHOP</h2>
          <button class="close-btn" id="forge-close-btn">✕</button>
        </div>

        <div class="forge-body">
          <div class="parts-selector">
            <!-- Layers -->
            <div class="part-category">
              <label>ENERGY LAYER</label>
              <select id="select-layer" class="forge-select"></select>
            </div>

            <!-- Discs -->
            <div class="part-category">
              <label>FORGE DISC</label>
              <select id="select-disc" class="forge-select"></select>
            </div>

            <!-- Drivers -->
            <div class="part-category">
              <label>PERFORMANCE DRIVER</label>
              <select id="select-driver" class="forge-select"></select>
            </div>
          </div>

          <!-- Live Stat Radar / Breakdown -->
          <div class="forge-stats-card">
            <h3 id="forge-preview-name">Vortex Striker</h3>
            <div class="stat-meters">
              <div class="stat-row">
                <span>ATTACK:</span>
                <div class="meter-bar"><div class="fill" id="stat-atk" style="width: 50%"></div></div>
                <strong id="val-atk">50</strong>
              </div>
              <div class="stat-row">
                <span>DEFENSE:</span>
                <div class="meter-bar"><div class="fill" id="stat-def" style="width: 50%"></div></div>
                <strong id="val-def">50</strong>
              </div>
              <div class="stat-row">
                <span>STAMINA:</span>
                <div class="meter-bar"><div class="fill" id="stat-sta" style="width: 50%"></div></div>
                <strong id="val-sta">50</strong>
              </div>
              <div class="stat-row">
                <span>BURST RESIST:</span>
                <div class="meter-bar"><div class="fill" id="stat-rst" style="width: 50%"></div></div>
                <strong id="val-rst">115</strong>
              </div>
            </div>
          </div>
        </div>

        <div class="forge-footer">
          <button class="forge-equip-btn" id="forge-equip-btn">EQUIP TOP</button>
        </div>
      </div>
    `;

    this.selectLayer = this.root.querySelector('#select-layer');
    this.selectDisc = this.root.querySelector('#select-disc');
    this.selectDriver = this.root.querySelector('#select-driver');

    this.previewName = this.root.querySelector('#forge-preview-name');
    this.barAtk = this.root.querySelector('#stat-atk');
    this.barDef = this.root.querySelector('#stat-def');
    this.barSta = this.root.querySelector('#stat-sta');
    this.barRst = this.root.querySelector('#stat-rst');
    this.valAtk = this.root.querySelector('#val-atk');
    this.valDef = this.root.querySelector('#val-def');
    this.valSta = this.root.querySelector('#val-sta');
    this.valRst = this.root.querySelector('#val-rst');

    this.closeBtn = this.root.querySelector('#forge-close-btn');
    this.equipBtn = this.root.querySelector('#forge-equip-btn');

    this._populateOptions();
    this._bindEvents();
    this._updateStats();
  }

  _populateOptions() {
    this.selectLayer.innerHTML = LAYERS.map(
      (l) => `<option value="${l.id}" ${l.id === this.selectedLayer ? 'selected' : ''}>${l.name} (${l.archetype.toUpperCase()})</option>`
    ).join('');

    this.selectDisc.innerHTML = DISCS.map(
      (d) => `<option value="${d.id}" ${d.id === this.selectedDisc ? 'selected' : ''}>${d.name} (${d.weight}g)</option>`
    ).join('');

    this.selectDriver.innerHTML = DRIVERS.map(
      (dr) => `<option value="${dr.id}" ${dr.id === this.selectedDriver ? 'selected' : ''}>${dr.name} (${dr.archetype.toUpperCase()})</option>`
    ).join('');
  }

  _bindEvents() {
    this.selectLayer.addEventListener('change', (e) => {
      this.selectedLayer = e.target.value;
      this._updateStats();
    });

    this.selectDisc.addEventListener('change', (e) => {
      this.selectedDisc = e.target.value;
      this._updateStats();
    });

    this.selectDriver.addEventListener('change', (e) => {
      this.selectedDriver = e.target.value;
      this._updateStats();
    });

    this.closeBtn.addEventListener('click', () => this.hide());

    this.equipBtn.addEventListener('click', () => {
      this.progression.setLoadout(this.selectedLayer, this.selectedDisc, this.selectedDriver);
      this.hide();
      if (this.onEquip) this.onEquip();
    });
  }

  _updateStats() {
    const stats = TopBuilder.calculateStats(this.selectedLayer, this.selectedDisc, this.selectedDriver);
    this.previewName.textContent = stats.name;

    this.valAtk.textContent = stats.attackPower;
    this.barAtk.style.width = `${Math.min(100, stats.attackPower)}%`;

    this.valDef.textContent = stats.defensePower;
    this.barDef.style.width = `${Math.min(100, stats.defensePower)}%`;

    this.valSta.textContent = stats.staminaRating;
    this.barSta.style.width = `${Math.min(100, stats.staminaRating)}%`;

    this.valRst.textContent = stats.burstResistance;
    this.barRst.style.width = `${Math.min(100, (stats.burstResistance / 150) * 100)}%`;
  }

  show() {
    this._populateOptions();
    this._updateStats();
    this.root.classList.remove('hidden');
  }

  hide() {
    this.root.classList.add('hidden');
  }
}

