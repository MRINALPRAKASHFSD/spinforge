/**
 * SPINFORGE - TopRenderer
 * Renders spinning top layers, rotating blade geometry, metallic weight disks,
 * dynamic precession wobble shadow, impact flashes, and energy core glow.
 * Synchronized with the game loop via sub-frame interpolation (alpha).
 */

export class TopRenderer {
  /**
   * Renders the contact shadow of a spinning top on the arena floor.
   * Separating shadow pass ensures all shadows are cast underneath all tops.
   * @param {CanvasRenderingContext2D} ctx
   * @param {import('../engine/SpinningTop.js').SpinningTop} top
   * @param {number} [alpha] Sub-frame interpolation factor
   */
  renderShadow(ctx, top, alpha = 1.0) {
    if (!top) return;

    // Sub-frame interpolated position
    const px = top.previousPosition ? top.previousPosition.x + (top.position.x - top.previousPosition.x) * alpha : top.position.x;
    const py = top.previousPosition ? top.previousPosition.y + (top.position.y - top.previousPosition.y) * alpha : top.position.y;

    const wobbleRadius = (top.wobbleMagnitude || 0) * 8;
    const wobbleX = Math.cos(top.wobbleAngle || 0) * wobbleRadius;
    const wobbleY = Math.sin(top.wobbleAngle || 0) * wobbleRadius;

    ctx.save();
    ctx.beginPath();
    ctx.ellipse(
      px - wobbleX * 0.4,
      py - wobbleY * 0.4 + 4,
      top.radius * 0.9,
      top.radius * 0.58,
      0,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
    ctx.fill();
    ctx.restore();
  }

  /**
   * Render a spinning top body on canvas.
   * Coordinate space should be arena space (0, 0 at center).
   * @param {CanvasRenderingContext2D} ctx
   * @param {import('../engine/SpinningTop.js').SpinningTop} top
   * @param {number} [alpha] Sub-frame interpolation factor
   */
  renderBody(ctx, top, alpha = 1.0) {
    if (!top) return;

    // Sub-frame interpolated position & rotation
    const px = top.previousPosition ? top.previousPosition.x + (top.position.x - top.previousPosition.x) * alpha : top.position.x;
    const py = top.previousPosition ? top.previousPosition.y + (top.position.y - top.previousPosition.y) * alpha : top.position.y;
    const rot = top.previousRotationAngle !== undefined ? top.previousRotationAngle + (top.rotationAngle - top.previousRotationAngle) * alpha : top.rotationAngle;

    ctx.save();

    // 1. Precession wobble offset calculation
    const wobbleRadius = (top.wobbleMagnitude || 0) * 8;
    const wobbleX = Math.cos(top.wobbleAngle || 0) * wobbleRadius;
    const wobbleY = Math.sin(top.wobbleAngle || 0) * wobbleRadius;

    // 2. Move to top position + wobble tilt
    ctx.translate(px + wobbleX, py + wobbleY);

    // If top is dead / sleeping / burst, adjust opacity
    if (!top.isAlive) {
      ctx.globalAlpha = top.isBurst ? 0.2 : 0.6;
    }

    // 3. Impact Flash effect on collision
    const isFlashing = (top.impactFlashTimer || 0) > 0;
    if (isFlashing) {
      ctx.beginPath();
      ctx.arc(0, 0, top.radius * 1.4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 16;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // 4. Energy Aura Glow based on RPM
    const rpmRatio = Math.min(1.0, top.rpm / top.maxRpm);
    if (top.isAlive && rpmRatio > 0.08) {
      ctx.beginPath();
      ctx.arc(0, 0, top.radius * (1.15 + rpmRatio * 0.15), 0, Math.PI * 2);

      let auraColor;
      if (top.owner === 'player') {
        auraColor = `rgba(0, 229, 255, ${0.1 + rpmRatio * 0.18})`;
      } else if (top.owner === 'cpu') {
        auraColor = `rgba(239, 68, 68, ${0.1 + rpmRatio * 0.18})`;
      } else {
        auraColor = `rgba(251, 191, 36, ${0.1 + rpmRatio * 0.15})`;
      }

      ctx.fillStyle = auraColor;
      ctx.fill();
    }

    // 5. High-RPM Motion Blur Streak Ring
    if (top.isAlive && top.rpm > 5500) {
      ctx.beginPath();
      ctx.arc(0, 0, top.radius * 1.02, 0, Math.PI * 2);
      ctx.lineWidth = 3;
      ctx.strokeStyle = top.primaryColor;
      ctx.globalAlpha = Math.min(0.4, (top.rpm - 5500) / 7000);
      ctx.stroke();
      ctx.globalAlpha = !top.isAlive ? (top.isBurst ? 0.2 : 0.6) : 1.0;
    }

    // 6. Metallic Weight Disk (rotates slower for gyroscopic look)
    ctx.save();
    ctx.rotate(rot * 0.35);
    ctx.beginPath();
    const diskSides = 8;
    for (let i = 0; i < diskSides; i++) {
      const a = (i * Math.PI * 2) / diskSides;
      const r = i % 2 === 0 ? top.radius * 0.92 : top.radius * 0.82;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = '#64748b';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#94a3b8';
    ctx.stroke();
    ctx.restore();

    // 7. Energy Blade Layer (Blade ring rotating at full RPM)
    ctx.save();
    ctx.rotate(rot);

    const blades = top.bladePoints || 4;
    ctx.beginPath();
    for (let i = 0; i < blades; i++) {
      const angle = (i * Math.PI * 2) / blades;
      const nextAngle = ((i + 1) * Math.PI * 2) / blades;
      const midAngle = angle + (nextAngle - angle) * 0.5;

      const rOuter = top.radius;
      const rInner = top.radius * 0.45;
      const rTip = top.radius * 1.05;

      const x0 = Math.cos(angle) * rInner;
      const y0 = Math.sin(angle) * rInner;
      const x1 = Math.cos(midAngle) * rTip;
      const y1 = Math.sin(midAngle) * rTip;
      const x2 = Math.cos(nextAngle) * rInner;
      const y2 = Math.sin(nextAngle) * rInner;

      if (i === 0) ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.lineTo(x2, y2);
    }
    ctx.closePath();
    ctx.fillStyle = isFlashing ? '#ffffff' : top.primaryColor;
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = isFlashing ? '#ffffff' : top.accentColor;
    ctx.stroke();

    // Blade accent wings
    for (let i = 0; i < blades; i++) {
      const a = (i * Math.PI * 2) / blades;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * top.radius * 0.7, Math.sin(a) * top.radius * 0.7, top.radius * 0.18, 0, Math.PI * 2);
      ctx.fillStyle = top.accentColor;
      ctx.fill();
    }
    ctx.restore();

    // 8. Central Bit-Chip / Core
    ctx.beginPath();
    ctx.arc(0, 0, top.radius * 0.38, 0, Math.PI * 2);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = top.coreColor;
    ctx.stroke();

    // Inner glowing emblem
    ctx.beginPath();
    ctx.arc(0, 0, top.radius * 0.22, 0, Math.PI * 2);
    ctx.fillStyle = top.coreColor;
    ctx.fill();

    // 9. Owner Targeting Indicator
    if (top.owner === 'player') {
      ctx.beginPath();
      ctx.moveTo(0, -top.radius - 8);
      ctx.lineTo(-6, -top.radius - 17);
      ctx.lineTo(6, -top.radius - 17);
      ctx.closePath();
      ctx.fillStyle = '#00e5ff';
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 6;
      ctx.fill();
      ctx.shadowBlur = 0;
    } else if (top.owner === 'cpu') {
      ctx.beginPath();
      ctx.moveTo(0, -top.radius - 8);
      ctx.lineTo(-6, -top.radius - 17);
      ctx.lineTo(6, -top.radius - 17);
      ctx.closePath();
      ctx.fillStyle = '#ef4444';
      ctx.fill();
    }

    ctx.restore();
  }

  /**
   * Unified render call rendering both shadow and body for a single top.
   * @param {CanvasRenderingContext2D} ctx
   * @param {import('../engine/SpinningTop.js').SpinningTop} top
   * @param {number} [alpha] Sub-frame interpolation factor
   */
  render(ctx, top, alpha = 1.0) {
    if (!top) return;
    this.renderShadow(ctx, top, alpha);
    this.renderBody(ctx, top, alpha);
  }
}
