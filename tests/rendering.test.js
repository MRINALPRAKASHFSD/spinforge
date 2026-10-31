/**
 * SPINFORGE - Rendering Pipeline & Unified Renderer Integration Tests
 * Validates unified Renderer interface, consistent render order, camera coordinate mappings,
 * independent top animations, particle collision triggers, and performance telemetry.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Renderer } from '../src/rendering/Renderer.js';
import { Camera } from '../src/rendering/Camera.js';
import { ArenaRenderer } from '../src/rendering/ArenaRenderer.js';
import { TopRenderer } from '../src/rendering/TopRenderer.js';
import { ParticleSystem } from '../src/rendering/ParticleSystem.js';
import { Arena } from '../src/engine/Arena.js';
import { SpinningTop } from '../src/engine/SpinningTop.js';
import { Vector2 } from '../src/engine/Vector2.js';

/**
 * Creates a mock 2D Canvas context that records draw calls and transform operations.
 */
function createMockCanvas(width = 800, height = 600) {
  const operations = [];

  const ctx = {
    canvas: { width, height },
    operations,
    save() { operations.push('save'); },
    restore() { operations.push('restore'); },
    setTransform() { operations.push('setTransform'); },
    scale(x, y) { operations.push(`scale(${x},${y})`); },
    translate(x, y) { operations.push(`translate(${Math.round(x)},${Math.round(y)})`); },
    rotate(angle) { operations.push(`rotate(${angle.toFixed(2)})`); },
    clearRect() { operations.push('clearRect'); },
    beginPath() { operations.push('beginPath'); },
    closePath() { operations.push('closePath'); },
    arc() { operations.push('arc'); },
    ellipse() { operations.push('ellipse'); },
    moveTo() { operations.push('moveTo'); },
    lineTo() { operations.push('lineTo'); },
    fill() { operations.push('fill'); },
    stroke() { operations.push('stroke'); },
    fillRect() { operations.push('fillRect'); },
    fillText() { operations.push('fillText'); },
    drawImage() { operations.push('drawImage'); },
    createRadialGradient() {
      return { addColorStop() {} };
    },
    setLineDash() {},
  };

  const canvas = {
    width,
    height,
    style: {},
    getContext: (type) => (type === '2d' ? ctx : null),
    parentElement: null,
  };

  return { canvas, ctx };
}

describe('Rendering: Camera & Coordinate Integration', () => {
  test('Camera correctly projects arena center (0, 0) to screen center', () => {
    const camera = new Camera({ viewportWidth: 800, viewportHeight: 600, arenaRadius: 300 });
    const screenCenter = camera.worldToScreen(new Vector2(0, 0));

    assert.strictEqual(screenCenter.x, 400, 'Arena center X must project to viewport width / 2');
    assert.strictEqual(screenCenter.y, 300, 'Arena center Y must project to viewport height / 2');
  });

  test('Camera screenToWorld inverse mapping correctly recovers arena coordinates', () => {
    const camera = new Camera({ viewportWidth: 1000, viewportHeight: 800, arenaRadius: 300 });
    const testWorldPoint = new Vector2(120, -85);

    const screenPoint = camera.worldToScreen(testWorldPoint);
    const recoveredWorldPoint = camera.screenToWorld(screenPoint.x, screenPoint.y);

    assert.ok(Math.abs(recoveredWorldPoint.x - testWorldPoint.x) < 0.001);
    assert.ok(Math.abs(recoveredWorldPoint.y - testWorldPoint.y) < 0.001);
  });

  test('Camera adapts zoom scale automatically to fit arena diameter', () => {
    const camera = new Camera({ viewportWidth: 400, viewportHeight: 400, arenaRadius: 300 });
    // On small screen (400x400), zoom should decrease below 1.0 to fit 600px diameter
    assert.ok(camera.zoom < 1.0, 'Camera zoom should scale down on compact viewports');

    camera.resize(1600, 1200);
    assert.ok(camera.zoom > 0.8, 'Camera zoom should adapt on larger screens');
  });

  test('Camera screen shake triggers and damps exponentially over time', () => {
    const camera = new Camera();
    camera.triggerShake(10, 0.2);

    assert.strictEqual(camera.shakeIntensity, 10);
    assert.strictEqual(camera.shakeDuration, 0.2);

    camera.update(0.1);
    assert.ok(camera.shakeDuration > 0);

    // Fast-forward past duration
    camera.update(0.15);
    assert.strictEqual(camera.shakeDuration, 0);
    assert.strictEqual(camera.shakeOffset.x, 0);
    assert.strictEqual(camera.shakeOffset.y, 0);
  });
});

describe('Rendering: Particle Effects & Collisions', () => {
  test('Emits sparks, expanding shockwaves, and floating combat text', () => {
    const ps = new ParticleSystem(100);
    const contactPoint = new Vector2(25, -40);
    const normal = new Vector2(1, 0);

    ps.emitSparks(contactPoint, normal, 15, '#ff0055');
    assert.strictEqual(ps.particles.length, 15);
    assert.strictEqual(ps.hasActiveEffects(), true);

    ps.emitShockwave(contactPoint, 40);
    assert.strictEqual(ps.shockwaves.length, 1);

    ps.emitFloatingText('-250 RPM', contactPoint);
    assert.strictEqual(ps.floatingTexts.length, 1);

    ps.update(0.016);
    assert.ok(ps.particles[0].life < 1.0);
  });

  test('Respects maximum bounded particle capacity without unbounded growth', () => {
    const max = 40;
    const ps = new ParticleSystem(max);
    const pos = new Vector2(0, 0);

    for (let i = 0; i < 10; i++) {
      ps.emitSparks(pos, null, 10);
    }

    assert.ok(ps.particles.length <= max, `Particle count should not exceed ${max}`);
  });
});

describe('Rendering: Independent Top Animations & Sub-frame Sync', () => {
  test('Both tops render with independent rotation angles, speeds, and wobbles', () => {
    const topA = new SpinningTop({ id: 'topA', maxRpm: 8000, spinDirection: 1 });
    const topB = new SpinningTop({ id: 'topB', maxRpm: 5000, spinDirection: -1 });

    topA.launch(new Vector2(-50, 0), new Vector2(10, 0), 8000);
    topB.launch(new Vector2(50, 0), new Vector2(-10, 0), 5000);

    const arena = new Arena();
    topA.update(0.05, arena);
    topB.update(0.05, arena);

    // Different RPMs and opposite spin directions produce distinct rotation angles
    assert.notStrictEqual(topA.rotationAngle, topB.rotationAngle);
    assert.ok(topA.rotationAngle > 0, 'CW top should have positive rotation angle');
    assert.ok(topB.rotationAngle < 0, 'CCW top should have negative rotation angle');
  });

  test('Sub-frame interpolation alpha interpolates positions between physics ticks', () => {
    const top = new SpinningTop({ id: 'interpTop' });
    top.previousPosition.set(0, 0);
    top.position.set(100, 50);

    const { ctx } = createMockCanvas();
    const renderer = new TopRenderer();

    // Render body at alpha = 0.5 (halfway between previous and current)
    renderer.renderBody(ctx, top, 0.5);

    // Context should have been translated to (50, 25) + wobble offset
    const translateCall = ctx.operations.find((op) => op.startsWith('translate('));
    assert.ok(translateCall, 'Must call ctx.translate');
    assert.ok(translateCall.includes('50') && translateCall.includes('25'));
  });

  test('Impact flash activates and fades on impact', () => {
    const top = new SpinningTop({ id: 'flashTop' });
    top.triggerImpactFlash(0.2);

    assert.ok(top.impactFlashTimer > 0);
    top.update(0.1, new Arena());
    assert.ok(top.impactFlashTimer > 0 && top.impactFlashTimer < 0.2);
  });
});

describe('Rendering: Unified Renderer Interface', () => {
  test('Renderer initializes all subsystems and maintains unified interface', () => {
    const { canvas } = createMockCanvas(800, 600);
    const arena = new Arena();
    const renderer = new Renderer(canvas, arena);

    assert.ok(renderer.camera instanceof Camera);
    assert.ok(renderer.arenaRenderer instanceof ArenaRenderer);
    assert.ok(renderer.topRenderer instanceof TopRenderer);
    assert.ok(renderer.particles instanceof ParticleSystem);
    assert.strictEqual(typeof renderer.render, 'function');
    assert.strictEqual(typeof renderer.update, 'function');
    assert.strictEqual(typeof renderer.triggerImpact, 'function');
    assert.strictEqual(typeof renderer.triggerBurst, 'function');
    assert.strictEqual(typeof renderer.triggerWallHit, 'function');
    assert.strictEqual(typeof renderer.getTelemetry, 'function');
  });

  test('Executes unified render pass following consistent layer order', () => {
    const { canvas, ctx } = createMockCanvas(800, 600);
    const arena = new Arena();
    const renderer = new Renderer(canvas, arena);

    const topA = new SpinningTop({ id: 'topA' });
    const topB = new SpinningTop({ id: 'topB' });
    topA.launch(new Vector2(-30, 0), new Vector2(0, 0), 7000);
    topB.launch(new Vector2(30, 0), new Vector2(0, 0), 7000);

    renderer.render([topA, topB], 1.0);

    const ops = ctx.operations;
    const clearIdx = ops.indexOf('clearRect');
    const firstSaveIdx = ops.indexOf('save');
    const firstEllipseIdx = ops.indexOf('ellipse'); // Top contact shadow
    const lastRestoreIdx = ops.lastIndexOf('restore');

    assert.ok(clearIdx !== -1, 'Must clear canvas');
    assert.ok(firstSaveIdx !== -1, 'Must save camera state');
    assert.ok(firstEllipseIdx > firstSaveIdx, 'Top shadows must be drawn within camera transform');
    assert.ok(lastRestoreIdx > firstEllipseIdx, 'Camera must be restored after render pass');
  });

  test('Telemetry reports frame times, draw calls, and 60 FPS target', () => {
    const { canvas } = createMockCanvas(800, 600);
    const arena = new Arena();
    const renderer = new Renderer(canvas, arena);

    renderer.render([]);
    const telemetry = renderer.getTelemetry();

    assert.ok(Number.isFinite(telemetry.fps));
    assert.ok(telemetry.fps >= 0);
    assert.ok(Number.isFinite(telemetry.frameTimeMs));
    assert.ok(telemetry.drawCalls > 0, 'Must record draw calls');
  });
});

