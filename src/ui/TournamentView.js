/**
 * SPINFORGE - TournamentView
 * Visual 8-competitor tournament bracket UI showing Quarterfinals, Semifinals, and Grand Finals.
 */

export class TournamentView {
  /**
   * @param {HTMLElement} container
   * @param {() => void} [onStartBattle]
   * @param {() => void} [onResetTournament]
   */
  constructor(container, onStartBattle, onResetTournament) {
    this.container = container;
    this.onStartBattle = onStartBattle;
    this.onResetTournament = onResetTournament;

    this.root = document.createElement('div');
    this.root.className = 'spinforge-tournament-overlay hidden';
    this.container.appendChild(this.root);

    this.bracketData = [];
    this.currentTierIndex = 0;

    this._buildElements();
  }

  _buildElements() {
    this.root.innerHTML = `
      <div class="tournament-modal">
        <div class="tournament-header">
          <div class="header-titles">
            <h2>🏆 CHAMPIONSHIP BRACKET</h2>
            <span class="sub-tier" id="tourney-current-tier">QUARTERFINALS</span>
          </div>
          <button class="close-btn" id="tourney-close-btn">✕</button>
        </div>

        <div class="bracket-container" id="bracket-grid">
          <!-- Dynamically populated 3-column bracket -->
        </div>

        <div class="tournament-footer">
          <button class="tourney-reset-btn" id="tourney-reset-btn">RESET BRACKET</button>
          <button class="tourney-battle-btn" id="tourney-battle-btn">ENTER BATTLE ARENA</button>
        </div>
      </div>
    `;

    this.elCurrentTier = this.root.querySelector('#tourney-current-tier');
    this.elBracketGrid = this.root.querySelector('#bracket-grid');
    this.closeBtn = this.root.querySelector('#tourney-close-btn');
    this.resetBtn = this.root.querySelector('#tourney-reset-btn');
    this.battleBtn = this.root.querySelector('#tourney-battle-btn');

    this._bindEvents();
  }

  _bindEvents() {
    this.closeBtn.addEventListener('click', () => this.hide());

    this.battleBtn.addEventListener('click', () => {
      this.hide();
      if (this.onStartBattle) this.onStartBattle();
    });

    this.resetBtn.addEventListener('click', () => {
      if (this.onResetTournament) this.onResetTournament();
    });
  }

  /**
   * Updates bracket tree visualization.
   * @param {any[]} bracket 3-tier bracket array
   * @param {number} tierIndex
   */
  update(bracket, tierIndex = 0) {
    this.bracketData = bracket;
    this.currentTierIndex = tierIndex;

    const tierLabels = ['QUARTERFINALS', 'SEMIFINALS', 'GRAND FINALS'];
    if (this.elCurrentTier) {
      this.elCurrentTier.textContent = tierLabels[tierIndex] || 'TOURNAMENT COMPLETE';
    }

    if (!this.elBracketGrid || !bracket || bracket.length === 0) return;

    this.elBracketGrid.innerHTML = bracket
      .map((tierMatches, tIdx) => {
        const colTitle = tierLabels[tIdx];
        const matchCards = tierMatches
          .map((m, mIdx) => {
            const p1Name = m.p1 ? m.p1.name : 'TBD';
            const p2Name = m.p2 ? m.p2.name : 'TBD';
            const p1Score = m.score ? m.score[0] : 0;
            const p2Score = m.score ? m.score[1] : 0;

            const isP1Winner = m.winner && m.winner === m.p1;
            const isP2Winner = m.winner && m.winner === m.p2;
            const isActivePlayerMatch = m.isPlayerMatch && tIdx === tierIndex && !m.winner;

            return `
              <div class="bracket-match ${isActivePlayerMatch ? 'active-match' : ''} ${m.winner ? 'finished-match' : ''}">
                <div class="competitor-slot ${isP1Winner ? 'winner' : ''} ${m.p1?.isPlayer ? 'player-slot' : ''}">
                  <span class="comp-name">${p1Name}</span>
                  <span class="comp-score">${p1Score}</span>
                </div>
                <div class="competitor-slot ${isP2Winner ? 'winner' : ''} ${m.p2?.isPlayer ? 'player-slot' : ''}">
                  <span class="comp-name">${p2Name}</span>
                  <span class="comp-score">${p2Score}</span>
                </div>
                ${isActivePlayerMatch ? '<div class="match-badge">NEXT FIGHT</div>' : ''}
              </div>
            `;
          })
          .join('');

        return `
          <div class="bracket-column tier-${tIdx}">
            <h4 class="tier-title">${colTitle}</h4>
            <div class="tier-matches">${matchCards}</div>
          </div>
        `;
      })
      .join('');
  }

  /**
   * Display tournament modal.
   * @param {any[]} bracket
   * @param {number} tierIndex
   */
  show(bracket, tierIndex) {
    if (bracket) {
      this.update(bracket, tierIndex);
    }
    this.root.classList.remove('hidden');
  }

  /**
   * Hide tournament modal.
   */
  hide() {
    this.root.classList.add('hidden');
  }
}

