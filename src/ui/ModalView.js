/**
 * SPINFORGE - ModalView
 * Dialog modal for round resolution, match victory/defeat summary, and rewards display.
 */

export class ModalView {
  /**
   * @param {HTMLElement} container
   */
  constructor(container) {
    this.container = container;
    this.root = document.createElement('div');
    this.root.className = 'spinforge-modal-overlay hidden';
    this.container.appendChild(this.root);

    /** @type {(() => void) | null} */
    this.onActionCallback = null;

    this._buildElements();
  }

  _buildElements() {
    this.root.innerHTML = `
      <div class="modal-card">
        <h2 class="modal-title" id="modal-title">VICTORY</h2>
        <div class="modal-subtitle" id="modal-sub">BURST FINISH (+3 PTS)</div>

        <div class="modal-stats" id="modal-stats">
          <div class="stat-row">
            <span>Score:</span>
            <strong id="modal-score">3 - 1</strong>
          </div>
          <div class="stat-row" id="modal-rewards-row">
            <span>Rewards:</span>
            <strong id="modal-rewards">+150 XP, +100 Credits</strong>
          </div>
        </div>

        <div class="modal-actions">
          <button class="modal-btn" id="modal-primary-btn">NEXT ROUND</button>
        </div>
      </div>
    `;

    this.elTitle = this.root.querySelector('#modal-title');
    this.elSub = this.root.querySelector('#modal-sub');
    this.elScore = this.root.querySelector('#modal-score');
    this.elRewards = this.root.querySelector('#modal-rewards');
    this.elRewardsRow = this.root.querySelector('#modal-rewards-row');
    this.primaryBtn = this.root.querySelector('#modal-primary-btn');

    this.primaryBtn.addEventListener('click', () => {
      this.hide();
      if (this.onActionCallback) {
        this.onActionCallback();
      }
    });
  }

  /**
   * Show modal with match resolution data.
   * @param {Object} data
   * @param {string} data.title
   * @param {string} data.subtitle
   * @param {string} data.score
   * @param {string} [data.buttonText]
   * @param {Object} [data.rewards]
   * @param {() => void} [onAction]
   */
  show(data, onAction) {
    this.elTitle.textContent = data.title;
    this.elSub.textContent = data.subtitle;
    this.elScore.textContent = data.score;
    this.primaryBtn.textContent = data.buttonText || 'CONTINUE';

    if (data.rewards) {
      this.elRewardsRow.style.display = 'flex';
      this.elRewards.textContent = `+${data.rewards.xpGained} XP, +${data.rewards.creditsGained} Credits`;
    } else {
      this.elRewardsRow.style.display = 'none';
    }

    this.onActionCallback = onAction || null;
    this.root.classList.remove('hidden');
  }

  hide() {
    this.root.classList.add('hidden');
  }
}

