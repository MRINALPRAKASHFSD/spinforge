/**
 * SPINFORGE - ParticleSystem
 * High-performance 2D particle emitter for battle sparks, rim grind friction,
 * expanding clash shockwaves, burst explosions, and floating combat text.
 * Uses bounded particle pooling to prevent GC pauses and sustain 60 FPS.
 */

export class ParticleSystem {
  /**
   * @param {number} [maxParticles]
   */
  constructor(maxParticles = 500) {
    this.maxParticles = maxParticles;

    /** @type {Array<Object>} */
    this.particles = [];

    /** @type {Array<{ x: number, y: number, currentRadius: number, maxRadius: number, life: number, color: string }>} */
    this.shockwaves = [];

    /** @type {Array<{ text: string, x: number, y: number, vy: number, life: number, color: string }>} */
    this.floatingTexts = [];
  }

  /**
   * Spawn a burst of collision sparks at contact point.
   * @param {import('../engine/Vector2.js').Vector2} position
   * @param {import('../engine/Vector2.js').Vector2} [direction] Normal vector pointing away from collision
   * @param {number} [count] Number of spark particles
   * @param {string} [color] Spark color
   */
  emitSparks(position, direction, count = 25, color = '#ffeb3b') {
    if (!position) return;
    const baseAngle = direction ? Math.atan2(direction.y, direction.x) : Math.random() * Math.PI * 2;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) {
        this.particles.shift();
      }

      // Spread angle +/- 45 degrees
      const spread = (Math.random() - 0.5) * Math.PI * 0.85;
      const angle = baseAngle + spread;
      const speed = 140 + Math.random() * 280;

      this.particles.push({
        x: position.x,
        y: position.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0,
        decay: 1.8 + Math.random() * 2.2,
        size: 2 + Math.random() * 3,
        color: Math.random() > 0.35 ? color : '#ffffff',
        type: 'spark',
      });
    }
  }

  /**
   * Spawn expanding shockwave ring at collision epicenter.
   * @param {import('../engine/Vector2.js').Vector2} position
   * @param {number} [maxRadius]
   * @param {string} [color]
   */
  emitShockwave(position, maxRadius = 42, color = 'rgba(0, 229, 255, 0.7)') {
    if (!position) return;
    this.shockwaves.push({
      x: position.x,
      y: position.y,
      currentRadius: 6,
      maxRadius,
      life: 1.0,
      color,
    });
  }

  /**
   * Spawn rim grind sparks along arena wall.
   * @param {import('../engine/Vector2.js').Vector2} position
   * @param {import('../engine/Vector2.js').Vector2} normal
   * @param {number} [count]
   */
  emitRimGrind(position, normal, count = 12) {
    if (!position || !normal) return;
    // Tangent perpendicular to wall normal
    const tangent = { x: -normal.y, y: normal.x };
    const baseAngle = Math.atan2(tangent.y, tangent.x);

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) {
        this.particles.shift();
      }

      const spread = (Math.random() - 0.5) * Math.PI * 0.4;
      const angle = baseAngle + spread;
      const speed = 100 + Math.random() * 220;

      this.particles.push({
        x: position.x,
        y: position.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0,
        decay: 2.2 + Math.random() * 1.5,
        size: 2 + Math.random() * 2.5,
        color: Math.random() > 0.4 ? '#00e5ff' : '#ffffff',
        type: 'spark',
      });
    }
  }

  /**
   * Spawn burst fragments when a top breaks apart.
   * @param {import('../engine/Vector2.js').Vector2} position
   * @param {string} [primaryColor]
   * @param {string} [accentColor]
   */
  emitBurst(position, primaryColor = '#00e5ff', accentColor = '#ff0077') {
    if (!position) return;
    const pieces = 24;
    for (let i = 0; i < pieces; i++) {
      if (this.particles.length >= this.maxParticles) {
        this.particles.shift();
      }

      const angle = (Math.PI * 2 * i) / pieces + (Math.random() - 0.5) * 0.3;
      const speed = 190 + Math.random() * 260;

      this.particles.push({
        x: position.x,
        y: position.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0,
        decay: 0.85 + Math.random() * 0.5,
        size: 5 + Math.random() * 6,
        color: i % 2 === 0 ? primaryColor : accentColor,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 16,
        type: 'fragment',
      });
    }

    // Heavy burst shockwave
    this.emitShockwave(position, 70, 'rgba(255, 255, 255, 0.9)');
  }

  /**
   * Spawn floating combat feedback text.
   * @param {string} text
   * @param {import('../engine/Vector2.js').Vector2} position
   * @param {string} [color]
   */
  emitFloatingText(text, position, color = '#fbbf24') {
    if (!position) return;
    this.floatingTexts.push({
      text,
      x: position.x,
      y: position.y - 12,
      vy: -40,
      life: 1.0,
      color,
    });
  }

  /**
   * Advance particles forward in time.
   * @param {number} dt Delta time in seconds
   */
  update(dt) {
    // 1. Update sparks and debris
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= p.decay * dt;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.94; // air friction
      p.vy *= 0.94;

      if (p.type === 'fragment') {
        p.rotation += p.rotSpeed * dt;
      }
    }

    // 2. Update shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const s = this.shockwaves[i];
      s.life -= dt * 2.5;
      s.currentRadius += (s.maxRadius - s.currentRadius) * dt * 10;

      if (s.life <= 0) {
        this.shockwaves.splice(i, 1);
      }
    }

    // 3. Update floating texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.life -= dt * 1.2;
      ft.y += ft.vy * dt;

      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  /**
   * Renders floor-level shockwaves (rendered beneath tops).
   * @param {CanvasRenderingContext2D} ctx
   */
  renderFloorEffects(ctx) {
    if (this.shockwaves.length === 0) return;

    ctx.save();
    for (const s of this.shockwaves) {
      ctx.globalAlpha = Math.max(0, s.life * 0.7);
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.currentRadius, 0, Math.PI * 2);
      ctx.lineWidth = 3;
      ctx.strokeStyle = s.color;
      ctx.stroke();
    }
    ctx.restore();
  }

  /**
   * Render high-energy particles (sparks, burst fragments) on top of tops.
   * @param {CanvasRenderingContext2D} ctx
   */
  render(ctx) {
    if (this.particles.length === 0 && this.floatingTexts.length === 0) return;

    ctx.save();

    // Render sparks and debris
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life);

      if (p.type === 'spark') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'fragment') {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      }
    }

    // Render floating combat texts
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    for (const ft of this.floatingTexts) {
      ctx.globalAlpha = Math.max(0, ft.life);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x, ft.y);
    }

    ctx.restore();
  }

  /**
   * Checks if any visual particle effect is currently alive.
   * Used for dirty-state checks to prevent unnecessary redraws when idle.
   * @returns {boolean}
   */
  hasActiveEffects() {
    return this.particles.length > 0 || this.shockwaves.length > 0 || this.floatingTexts.length > 0;
  }

  /**
   * Reset all particles.
   */
  clear() {
    this.particles = [];
    this.shockwaves = [];
    this.floatingTexts = [];
  }
}
