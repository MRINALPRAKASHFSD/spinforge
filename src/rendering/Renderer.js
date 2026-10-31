/**
 * SPINFORGE - Unified Renderer Interface
 * Master rendering coordinator unifying Arena, Spinning Tops, Particle Systems,
 * 2D Camera projections, and performance telemetry into a single deterministic pipeline.
 */

import { Camera } from './Camera.js';
import { ArenaRenderer } from './ArenaRenderer.js';
import { TopRenderer } from './TopRenderer.js';
import { ParticleSystem } from './ParticleSystem.js';
import { Vector2 } from '../engine/Vector2.js';

export class Renderer {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {import('../engine/Arena.js').Arena} arena
   * @param {Object} [options]
   * @param {boolean} [options.offscreenCaching=true]
   * @param {boolean} [options.dynamicCamera=true]
   */
  constructor(canvas, arena, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext ? canvas.getContext('2d') : null;
    this.arena = arena;
    this.options = {
      offscreenCaching: options.offscreenCaching ?? true,
      dynamicCamera: options.dynamicCamera ?? true,
      ...options,
    };

    // Subsystem components
    this.camera = new Camera({ arenaRadius: arena.radius });
    this.arenaRenderer = new ArenaRenderer(arena);
    this.topRenderer = new TopRenderer();
    this.particles = new ParticleSystem(500);

    // Performance telemetry
    this.telemetry = {
      fps: 60,
      frameTimeMs: 0,
      drawCalls: 0,
      particleCount: 0,
      frameCount: 0,
      lastFpsUpdate: typeof performance !== 'undefined' ? performance.now() : 0,
    };

    // Render dirty optimization state
    this.isDirty = true;
    this.idleFrameCount = 0;

    // Viewport dimensions
    this.width = canvas.width || 800;
    this.height = canvas.height || 600;
    this.dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

    this._bindResize();
  }

  /**
   * Bind window resize listener with High-DPI scaling.
   * @private
   */
  _bindResize() {
    if (typeof window === 'undefined') return;

    this.resize = () => {
      const parent = this.canvas.parentElement || document.body;
      const rect = parent.getBoundingClientRect();
      const w = Math.floor(rect.width) || window.innerWidth;
      const h = Math.floor(rect.height) || window.innerHeight;

      this.width = w;
      this.height = h;
      this.dpr = window.devicePixelRatio || 1;

      this.canvas.width = Math.floor(w * this.dpr);
      this.canvas.height = Math.floor(h * this.dpr);
      this.canvas.style.width = `${w}px`;
      this.canvas.style.height = `${h}px`;

      this.camera.resize(w, h, this.dpr);
      this.arenaRenderer.invalidateCache();
      this.isDirty = true;
    };

    window.addEventListener('resize', this.resize);
    this.resize();
  }

  /**
   * Converts screen CSS coordinate (from mouse/touch event) into arena world coordinate.
   * @param {number} screenX
   * @param {number} screenY
   * @returns {Vector2}
   */
  screenToArena(screenX, screenY) {
    return this.camera.screenToWorld(screenX, screenY);
  }

  /**
   * Converts arena world coordinate to screen CSS coordinate.
   * @param {number} arenaX
   * @param {number} arenaY
   * @returns {Vector2}
   */
  arenaToScreen(arenaX, arenaY) {
    return this.camera.worldToScreen({ x: arenaX, y: arenaY });
  }

  /**
   * Triggers collision impact effects: directional sparks, expanding shockwave,
   * camera shake, and floating damage indicator.
   * @param {Vector2} contactPoint
   * @param {Vector2} normal
   * @param {number} impulse
   * @param {boolean} isHardImpact
   */
  triggerImpact(contactPoint, normal, impulse, isHardImpact = false) {
    const sparkCount = isHardImpact ? 35 : 18;
    const sparkColor = isHardImpact ? '#ff0055' : '#ffeb3b';

    this.particles.emitSparks(contactPoint, normal, sparkCount, sparkColor);
    this.particles.emitShockwave(contactPoint, isHardImpact ? 48 : 28);

    if (isHardImpact) {
      this.camera.triggerShake(7, 0.22);
      this.particles.emitFloatingText('CRUSH!', contactPoint, '#ff0055');
    } else {
      this.camera.triggerShake(3, 0.12);
    }

    this.isDirty = true;
  }

  /**
   * Triggers burst finish effects: explosive fragments, heavy shockwave, and screen shake.
   * @param {Vector2} position
   * @param {string} primaryColor
   * @param {string} accentColor
   */
  triggerBurst(position, primaryColor, accentColor) {
    this.particles.emitBurst(position, primaryColor, accentColor);
    this.particles.emitFloatingText('BURST FINISH!', position, '#fbbf24');
    this.camera.triggerShake(14, 0.45);
    this.isDirty = true;
  }

  /**
   * Triggers arena wall rebound friction sparks.
   * @param {Vector2} position
   * @param {Vector2} normal
   * @param {number} speed
   */
  triggerWallHit(position, normal, speed) {
    if (speed > 30) {
      this.particles.emitRimGrind(position, normal, Math.min(20, Math.floor(speed * 0.15)));
      this.camera.triggerShake(2.5, 0.1);
      this.isDirty = true;
    }
  }

  /**
   * Adds floating combat text in world coordinates.
   * @param {string} text
   * @param {Vector2} position
   * @param {string} [color]
   */
  addFloatingText(text, position, color) {
    this.particles.emitFloatingText(text, position, color);
    this.isDirty = true;
  }

  /**
   * Triggers camera screen shake.
   * @param {number} intensity
   * @param {number} duration
   */
  triggerShake(intensity, duration) {
    this.camera.triggerShake(intensity, duration);
    this.isDirty = true;
  }

  /**
   * Frame animation update step.
   * @param {number} dt Delta time in seconds
   */
  update(dt) {
    this.camera.update(dt);
    this.arenaRenderer.update(dt);
    this.particles.update(dt);

    if (this.particles.hasActiveEffects() || this.camera.shakeDuration > 0) {
      this.isDirty = true;
    }
  }

  /**
   * Master Unified Render Pass.
   * Executes in a strictly defined layer order:
   * 1. Clear Screen
   * 2. Camera Transform (centering, zoom, shake)
   * 3. Arena Environment (cached static bowl + dynamic vortex)
   * 4. Floor Effects (shockwaves)
   * 5. Top Contact Shadows
   * 6. Spinning Tops (with independent animations & sub-frame interpolation)
   * 7. Particle Effects (sparks, burst debris)
   * 8. In-Arena Launch Trajectory / Aiming Guide
   * 9. Camera Restore
   * 10. Frame Telemetry Update
   *
   * @param {import('../engine/SpinningTop.js').SpinningTop[] | { tops: import('../engine/SpinningTop.js').SpinningTop[], launcher?: any }} scene
   * @param {number} [alpha=1.0] Sub-frame interpolation factor
   */
  render(scene = [], alpha = 1.0) {
    const ctx = this.ctx;
    if (!ctx) return;

    const startTime = typeof performance !== 'undefined' ? performance.now() : 0;
    let drawCalls = 0;

    // Normalize scene input
    let tops = [];
    let launcher = null;
    if (Array.isArray(scene)) {
      tops = scene;
    } else if (scene && typeof scene === 'object') {
      tops = scene.tops || [];
      launcher = scene.launcher || null;
    }

    // Dynamic camera midpoint tracking if battling
    if (this.options.dynamicCamera && tops.length >= 2) {
      const topA = tops[0];
      const topB = tops[1];
      if (topA.isAlive && topB.isAlive) {
        this.camera.trackMidpoint(topA.position, topB.position);
      }
    }

    // Step 1 & 2: Reset transform & Clear canvas
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    drawCalls++;

    // Step 3: Apply Camera viewport transformation
    this.camera.apply(ctx);

    // Step 4: Render Arena bowl
    this.arenaRenderer.render(ctx);
    drawCalls++;

    // Step 5: Render Floor Effects (expanding shockwave rings)
    this.particles.renderFloorEffects(ctx);
    drawCalls++;

    // Step 6: Render Top Contact Shadows (all shadows cast onto floor)
    for (const top of tops) {
      this.topRenderer.renderShadow(ctx, top, alpha);
      drawCalls++;
    }

    // Step 7: Render Spinning Tops with independent animations
    for (const top of tops) {
      this.topRenderer.renderBody(ctx, top, alpha);
      drawCalls++;
    }

    // Step 8: Render Particle Effects (collision sparks, rim grinds, debris, text)
    this.particles.render(ctx);
    drawCalls++;

    // Step 9: Render Launch Trajectory / Aiming Guide (if rip-cord launcher is active)
    if (launcher && launcher.state !== 'LAUNCHED') {
      this._renderLaunchGuide(ctx, launcher);
      drawCalls++;
    }

    // Step 10: Restore Camera transform
    this.camera.restore(ctx);

    // Step 11: Update performance telemetry
    if (typeof performance !== 'undefined') {
      const now = performance.now();
      this.telemetry.frameTimeMs = Math.round((now - startTime) * 100) / 100;
      this.telemetry.drawCalls = drawCalls;
      this.telemetry.particleCount = this.particles.particles.length + this.particles.shockwaves.length;
      this.telemetry.frameCount++;

      if (now - this.telemetry.lastFpsUpdate >= 500) {
        this.telemetry.fps = Math.round((this.telemetry.frameCount * 1000) / (now - this.telemetry.lastFpsUpdate));
        this.telemetry.frameCount = 0;
        this.telemetry.lastFpsUpdate = now;
      }
    }
  }

  /**
   * Render in-arena trajectory aiming line during launch phase.
   * @param {CanvasRenderingContext2D} ctx
   * @param {any} launcher
   * @private
   */
  _renderLaunchGuide(ctx, launcher) {
    if (!launcher.spawnPosition) return;

    ctx.save();
    const spawn = launcher.spawnPosition;
    const angle = launcher.angle;
    const power = launcher.power || 0.3;

    const lineLength = 70 + power * 90;
    const targetX = spawn.x + Math.cos(angle) * lineLength;
    const targetY = spawn.y + Math.sin(angle) * lineLength;

    // Dotted trajectory line
    ctx.beginPath();
    ctx.moveTo(spawn.x, spawn.y);
    ctx.lineTo(targetX, targetY);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = power >= 0.85 ? '#fbbf24' : '#00e5ff';
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Entry point marker
    ctx.beginPath();
    ctx.arc(spawn.x, spawn.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#00e5ff';
    ctx.fill();

    ctx.restore();
  }

  /**
   * Returns live performance telemetry and metrics.
   * @returns {{ fps: number, frameTimeMs: number, drawCalls: number, particleCount: number, zoom: number }}
   */
  getTelemetry() {
    return {
      fps: this.telemetry.fps,
      frameTimeMs: this.telemetry.frameTimeMs,
      drawCalls: this.telemetry.drawCalls,
      particleCount: this.telemetry.particleCount,
      zoom: Math.round(this.camera.zoom * 100) / 100,
    };
  }

  /**
   * Cleanup event listeners.
   */
  destroy() {
    if (typeof window !== 'undefined' && this.resize) {
      window.removeEventListener('resize', this.resize);
    }
  }
}

