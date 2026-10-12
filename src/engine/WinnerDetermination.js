/**
 * SPINFORGE - WinnerDetermination
 * Evaluates round resolution, point allocation, and simultaneous elimination scenarios.
 */

import { FINISH_TYPES, FINISH_POINTS, BATTLE_RULES } from './constants.js';

export class WinnerDetermination {
  /**
   * Evaluates the current state of two tops and determines if the round is concluded.
   * Handles single and simultaneous elimination conditions.
   *
   * @param {import('./SpinningTop.js').SpinningTop} topA
   * @param {import('./SpinningTop.js').SpinningTop} topB
   * @param {Object} [options]
   * @param {number} [options.simultaneousThresholdSec=0.08]
   * @returns {{ isOver: boolean, winner: import('./SpinningTop.js').SpinningTop | null, loser: import('./SpinningTop.js').SpinningTop | null, finishType: string | null, points: number, isDraw: boolean, reason: string }}
   */
  static evaluate(topA, topB, options = {}) {
    const thresholdSec = options.simultaneousThresholdSec ?? BATTLE_RULES.SIMULTANEOUS_THRESHOLD_SEC;

    const aAlive = topA.isAlive;
    const bAlive = topB.isAlive;

    // Both still actively fighting
    if (aAlive && bAlive) {
      return {
        isOver: false,
        winner: null,
        loser: null,
        finishType: null,
        points: 0,
        isDraw: false,
        reason: 'IN_PROGRESS',
      };
    }

    // Check simultaneous elimination scenario
    if (!aAlive && !bAlive) {
      const timeDiff = Math.abs((topA.eliminationTime || 0) - (topB.eliminationTime || 0)) / 1000;
      const isSimultaneous = timeDiff <= thresholdSec;

      // Case 1: Both Burst
      if (topA.isBurst && topB.isBurst) {
        return {
          isOver: true,
          winner: null,
          loser: null,
          finishType: FINISH_TYPES.DRAW,
          points: 0,
          isDraw: true,
          reason: 'SIMULTANEOUS_BURST',
        };
      }

      // Case 2: Both Ring Out / Over Finish
      if (topA.isRingOut && topB.isRingOut) {
        return {
          isOver: true,
          winner: null,
          loser: null,
          finishType: FINISH_TYPES.DRAW,
          points: 0,
          isDraw: true,
          reason: 'SIMULTANEOUS_RING_OUT',
        };
      }

      // Case 3: Both Sleep (Simultaneous spin stop)
      if (topA.isSleeping && topB.isSleeping) {
        if (isSimultaneous) {
          // Compare final RPM if there is a discernible margin (> 40 RPM)
          const rpmDiff = topA.rpm - topB.rpm;
          if (Math.abs(rpmDiff) > 40) {
            const winner = rpmDiff > 0 ? topA : topB;
            const loser = winner === topA ? topB : topA;
            return {
              isOver: true,
              winner,
              loser,
              finishType: FINISH_TYPES.SPIN_FINISH,
              points: FINISH_POINTS[FINISH_TYPES.SPIN_FINISH],
              isDraw: false,
              reason: 'SPIN_RPM_DECISION',
            };
          }
          return {
            isOver: true,
            winner: null,
            loser: null,
            finishType: FINISH_TYPES.DRAW,
            points: 0,
            isDraw: true,
            reason: 'SIMULTANEOUS_SLEEP',
          };
        }

        // Distinct sleep times: the one eliminated later wins
        const winner = (topA.eliminationTime || 0) > (topB.eliminationTime || 0) ? topA : topB;
        const loser = winner === topA ? topB : topA;
        return {
          isOver: true,
          winner,
          loser,
          finishType: FINISH_TYPES.SPIN_FINISH,
          points: FINISH_POINTS[FINISH_TYPES.SPIN_FINISH],
          isDraw: false,
          reason: 'SPIN_FINISH',
        };
      }

      // Mixed double knockout (e.g. one burst, one ring out) within grace period
      if (isSimultaneous) {
        return {
          isOver: true,
          winner: null,
          loser: null,
          finishType: FINISH_TYPES.DRAW,
          points: 0,
          isDraw: true,
          reason: 'SIMULTANEOUS_MIXED',
        };
      }
    }

    // Single winner determination
    const winner = aAlive ? topA : topB;
    const loser = aAlive ? topB : topA;

    let finishType = FINISH_TYPES.SPIN_FINISH;
    if (loser.isBurst) {
      finishType = FINISH_TYPES.BURST_FINISH;
    } else if (loser.isRingOut) {
      // Over pocket vs over rim
      finishType = loser.eliminationReason === 'RING_OUT'
        ? FINISH_TYPES.RING_OUT
        : FINISH_TYPES.OVER_FINISH;
    } else {
      finishType = FINISH_TYPES.SPIN_FINISH;
    }

    return {
      isOver: true,
      winner,
      loser,
      finishType,
      points: FINISH_POINTS[finishType] || 1,
      isDraw: false,
      reason: finishType,
    };
  }
}

