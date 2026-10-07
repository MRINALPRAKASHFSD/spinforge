/**
 * SPINFORGE - CanvasRenderer
 * High-DPI responsive canvas manager and rendering pipeline implementation.
 * Subclasses the unified Renderer interface for backward compatibility.
 */

import { Renderer } from './Renderer.js';

export class CanvasRenderer extends Renderer {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {import('../engine/Arena.js').Arena} arena
   * @param {Object} [options]
   */
  constructor(canvas, arena, options = {}) {
    super(canvas, arena, options);
  }
}
