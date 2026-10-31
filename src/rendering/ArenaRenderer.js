/**
 * SPINFORGE - ArenaRenderer
 * Renders the circular concave battle dish, depth contours, hazard pockets, and center vortex.
 * Uses offscreen canvas caching to prevent redundant redraw operations and maximize rendering performance.
 */

export class ArenaRenderer {
  /**
   * @param {import('../engine/Arena.js').Arena} arena
   */
  constructor(arena) {
    this.arena = arena;

    // Offscreen caching for static dish geometry
    this.cachedCanvas = null;
    this.cachedCtx = null;
    this.cacheValid = false;
    this.offscreenPadding = 30;

    // Animation time for dynamic center vortex pulse
    this.animationTimer = 0;

    this._initOffscreenCache();
  }

  /**
   * Initializes or invalidates the offscreen canvas cache.
   * @private
   */
  _initOffscreenCache() {
    if (typeof document === 'undefined') return;

    try {
      const size = Math.ceil((this.arena.radius + this.offscreenPadding) * 2);
      if (!this.cachedCanvas) {
        if (typeof OffscreenCanvas !== 'undefined') {
          this.cachedCanvas = new OffscreenCanvas(size, size);
        } else {
          this.cachedCanvas = document.createElement('canvas');
          this.cachedCanvas.width = size;
          this.cachedCanvas.height = size;
        }
      } else {
        this.cachedCanvas.width = size;
        this.cachedCanvas.height = size;
      }
      this.cachedCtx = this.cachedCanvas.getContext('2d');
      this.cacheValid = false;
    } catch (e) {
      this.cachedCanvas = null;
      this.cachedCtx = null;
    }
  }

  /**
   * Invalidate the cached static dish to force a re-bake (e.g. upon resize).
   */
  invalidateCache() {
    this.cacheValid = false;
  }

  /**
   * Bakes static dish elements (outer rim, depth gradient, ridge lines, hazard cavities) to offscreen canvas.
   * @private
   */
  _bakeStaticDish() {
    if (!this.cachedCtx) return;

    const ctx = this.cachedCtx;
    const { radius, pockets } = this.arena;
    const halfSize = radius + this.offscreenPadding;

    ctx.clearRect(0, 0, halfSize * 2, halfSize * 2);

    ctx.save();
    ctx.translate(halfSize, halfSize);

    // 1. Outer rim bezel & shadow
    ctx.beginPath();
    ctx.arc(0, 0, radius + 18, 0, Math.PI * 2);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.lineWidth = 14;
    ctx.strokeStyle = '#334155';
    ctx.stroke();

    // Outer neon rim highlight
    ctx.beginPath();
    ctx.arc(0, 0, radius + 8, 0, Math.PI * 2);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.4)';
    ctx.stroke();

    // 2. Concave dish bowl radial gradient (dark center deep well)
    const bowlGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, radius);
    bowlGrad.addColorStop(0, '#020617'); // deep center
    bowlGrad.addColorStop(0.4, '#0f172a');
    bowlGrad.addColorStop(0.85, '#1e293b');
    bowlGrad.addColorStop(1.0, '#334155'); // high rim

    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fillStyle = bowlGrad;
    ctx.fill();

    // 3. Concentric slope ridge lines
    const ringCount = 5;
    ctx.lineWidth = 1;
    for (let i = 1; i <= ringCount; i++) {
      const ringRadius = (radius / ringCount) * i;
      ctx.beginPath();
      ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
      ctx.strokeStyle = i === ringCount ? 'rgba(255, 255, 255, 0.25)' : 'rgba(56, 189, 248, 0.08)';
      ctx.stroke();
    }

    // 4. Knockout hazard pockets
    for (const pocket of pockets) {
      ctx.save();
      ctx.translate(pocket.position.x, pocket.position.y);

      // Deep pocket cavity
      const pocketGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, pocket.radius);
      pocketGrad.addColorStop(0, '#000000');
      pocketGrad.addColorStop(0.8, '#090d16');
      pocketGrad.addColorStop(1.0, '#1e293b');

      ctx.beginPath();
      ctx.arc(0, 0, pocket.radius, 0, Math.PI * 2);
      ctx.fillStyle = pocketGrad;
      ctx.fill();

      // Warning hazard rim
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#ef4444';
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.restore();
    }

    ctx.restore();
    this.cacheValid = true;
  }

  /**
   * Updates dynamic arena animations.
   * @param {number} dt
   */
  update(dt) {
    this.animationTimer += dt;
  }

  /**
   * Renders the complete arena dish onto canvas context.
   * Coordinate origin is expected to be at arena center (0, 0).
   * @param {CanvasRenderingContext2D} ctx
   */
  render(ctx) {
    const { radius } = this.arena;
    const halfSize = radius + this.offscreenPadding;

    ctx.save();

    // Fast path: draw pre-baked static dish from offscreen cache
    if (this.cachedCanvas) {
      if (!this.cacheValid) {
        this._bakeStaticDish();
      }
      ctx.drawImage(this.cachedCanvas, -halfSize, -halfSize);
    } else {
      // Fallback direct rendering (e.g. in test environments without OffscreenCanvas)
      this._renderDirect(ctx);
    }

    // Dynamic Elements: Animated Center Vortex & Battle Zone Crosshairs
    const pulse = 1.0 + Math.sin(this.animationTimer * 3) * 0.08;
    ctx.save();

    // Animated outer vortex dash ring
    ctx.beginPath();
    ctx.arc(0, 0, 36 * pulse, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(244, 63, 94, 0.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Glowing center node
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(244, 63, 94, 0.85)';
    ctx.shadowColor = '#f43f5e';
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Crosshairs
    ctx.beginPath();
    ctx.moveTo(-18, 0);
    ctx.lineTo(18, 0);
    ctx.moveTo(0, -18);
    ctx.lineTo(0, 18);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();
    ctx.restore();
  }

  /**
   * Fallback direct rendering if offscreen canvas is unavailable.
   * @param {CanvasRenderingContext2D} ctx
   * @private
   */
  _renderDirect(ctx) {
    const { radius, pockets } = this.arena;

    // Outer rim bezel & shadow
    ctx.beginPath();
    ctx.arc(0, 0, radius + 18, 0, Math.PI * 2);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.lineWidth = 14;
    ctx.strokeStyle = '#334155';
    ctx.stroke();

    // Dish bowl gradient
    const bowlGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, radius);
    bowlGrad.addColorStop(0, '#020617');
    bowlGrad.addColorStop(0.4, '#0f172a');
    bowlGrad.addColorStop(0.85, '#1e293b');
    bowlGrad.addColorStop(1.0, '#334155');

    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fillStyle = bowlGrad;
    ctx.fill();

    // Concentric slope lines
    const ringCount = 5;
    ctx.lineWidth = 1;
    for (let i = 1; i <= ringCount; i++) {
      const ringRadius = (radius / ringCount) * i;
      ctx.beginPath();
      ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
      ctx.strokeStyle = i === ringCount ? 'rgba(255, 255, 255, 0.25)' : 'rgba(56, 189, 248, 0.08)';
      ctx.stroke();
    }

    // Pockets
    for (const pocket of pockets) {
      ctx.save();
      ctx.translate(pocket.position.x, pocket.position.y);
      const pocketGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, pocket.radius);
      pocketGrad.addColorStop(0, '#000000');
      pocketGrad.addColorStop(0.8, '#090d16');
      pocketGrad.addColorStop(1.0, '#1e293b');
      ctx.beginPath();
      ctx.arc(0, 0, pocket.radius, 0, Math.PI * 2);
      ctx.fillStyle = pocketGrad;
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#ef4444';
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
  }
}
