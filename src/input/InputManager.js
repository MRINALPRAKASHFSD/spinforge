/**
 * SPINFORGE - InputManager
 * Captures hardware inputs (keyboard, mouse, pointer, touch) and exposes normalized action states.
 */

export class InputManager {
  /**
   * @param {HTMLElement} [targetElement]
   */
  constructor(targetElement = typeof window !== 'undefined' ? window : null) {
    this.target = targetElement;

    // Keys currently held down
    this.keys = new Set();

    // Mouse / touch coordinate state
    this.pointer = { x: 0, y: 0, isDown: false };

    // Abstract action states
    this.actions = {
      up: false,
      down: false,
      left: false,
      right: false,
      launch: false,
      reset: false,
      pause: false,
    };

    /** @type {Set<(action: string, data?: any) => void>} */
    this.actionListeners = new Set();

    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerUp = this._onPointerUp.bind(this);

    this.bindEvents();
  }

  /**
   * Attach browser event listeners.
   */
  bindEvents() {
    if (!this.target) return;

    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('pointermove', this._onPointerMove);
    window.addEventListener('pointerdown', this._onPointerDown);
    window.addEventListener('pointerup', this._onPointerUp);
  }

  /**
   * Remove browser event listeners.
   */
  destroy() {
    if (!this.target) return;

    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('pointermove', this._onPointerMove);
    window.removeEventListener('pointerdown', this._onPointerDown);
    window.removeEventListener('pointerup', this._onPointerUp);
  }

  /**
   * Subscribe to discrete action triggers.
   * @param {(action: string, data?: any) => void} listener
   * @returns {() => void}
   */
  onAction(listener) {
    this.actionListeners.add(listener);
    return () => this.actionListeners.delete(listener);
  }

  /**
   * Dispatch action event.
   * @param {string} action
   * @param {any} [data]
   * @private
   */
  _emitAction(action, data) {
    for (const listener of this.actionListeners) {
      try {
        listener(action, data);
      } catch (err) {
        console.error('InputManager action error:', err);
      }
    }
  }

  /**
   * @param {KeyboardEvent} e
   * @private
   */
  _onKeyDown(e) {
    if (e.repeat) return;
    this.keys.add(e.code);
    this._updateKeysState();

    if (e.code === 'Space') {
      this._emitAction('launch');
    } else if (e.code === 'KeyR') {
      this._emitAction('reset');
    } else if (e.code === 'KeyP' || e.code === 'Escape') {
      this._emitAction('pause');
    }
  }

  /**
   * @param {KeyboardEvent} e
   * @private
   */
  _onKeyUp(e) {
    this.keys.delete(e.code);
    this._updateKeysState();
  }

  /**
   * Synchronize continuous directional booleans.
   * @private
   */
  _updateKeysState() {
    this.actions.up = this.keys.has('KeyW') || this.keys.has('ArrowUp');
    this.actions.down = this.keys.has('KeyS') || this.keys.has('ArrowDown');
    this.actions.left = this.keys.has('KeyA') || this.keys.has('ArrowLeft');
    this.actions.right = this.keys.has('KeyD') || this.keys.has('ArrowRight');
  }

  /**
   * @param {PointerEvent} e
   * @private
   */
  _onPointerMove(e) {
    this.pointer.x = e.clientX;
    this.pointer.y = e.clientY;
  }

  /**
   * @param {PointerEvent} e
   * @private
   */
  _onPointerDown(e) {
    this.pointer.isDown = true;
    this.pointer.x = e.clientX;
    this.pointer.y = e.clientY;
    this._emitAction('pointer_down', { x: e.clientX, y: e.clientY });
  }

  /**
   * @param {PointerEvent} e
   * @private
   */
  _onPointerUp(e) {
    this.pointer.isDown = false;
    this._emitAction('pointer_up', { x: e.clientX, y: e.clientY });
  }

  /**
   * Returns normalized 2D movement vector from currently pressed directional inputs.
   * @returns {{ x: number, y: number }}
   */
  getMovementVector() {
    let dx = 0;
    let dy = 0;
    if (this.actions.left) dx -= 1;
    if (this.actions.right) dx += 1;
    if (this.actions.up) dy -= 1;
    if (this.actions.down) dy += 1;

    // Normalize diagonal speed
    if (dx !== 0 && dy !== 0) {
      const invSqrt = 0.70710678;
      dx *= invSqrt;
      dy *= invSqrt;
    }

    return { x: dx, y: dy };
  }
}

