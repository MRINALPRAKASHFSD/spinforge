/**
 * SPINFORGE - Engine & Physics Tests
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Vector2 } from '../src/engine/Vector2.js';
import { Arena } from '../src/engine/Arena.js';
import { SpinningTop } from '../src/engine/SpinningTop.js';
import { PhysicsWorld } from '../src/engine/PhysicsWorld.js';
import { GameEngine } from '../src/engine/GameEngine.js';

describe('Engine: Vector2', () => {
  test('Vector addition and subtraction', () => {
    const a = new Vector2(3, 4);
    const b = new Vector2(1, 2);
    a.add(b);
    assert.strictEqual(a.x, 4);
    assert.strictEqual(a.y, 6);

    a.sub(b);
    assert.strictEqual(a.x, 3);
    assert.strictEqual(a.y, 4);
  });

  test('Vector magnitude, normalize and distance', () => {
    const v = new Vector2(3, 4);
    assert.strictEqual(v.length(), 5);

    const target = new Vector2(3, 8);
    assert.strictEqual(v.distanceTo(target), 4);

    v.normalize();
    assert.ok(Math.abs(v.length() - 1.0) < 0.0001);
  });

  test('Vector dot product and reflection', () => {
    const v = new Vector2(10, 0);
    const normal = new Vector2(-1, 0);
    assert.strictEqual(v.dot(normal), -10);

    v.reflect(normal);
    assert.strictEqual(Math.round(v.x), -10);
    assert.strictEqual(Math.round(v.y), 0);
  });
});

describe('Engine: Arena', () => {
  test('Arena initializes with boundary radius and knockout pockets', () => {
    const arena = new Arena({ RADIUS: 300, POCKET_COUNT: 4 });
    assert.strictEqual(arena.radius, 300);
    assert.strictEqual(arena.pockets.length, 4);
  });

  test('Arena slope force directs towards stadium bowl center', () => {
    const arena = new Arena({ RADIUS: 300, DEPTH_SLOPE: 100 });
    const pos = new Vector2(150, 0);
    const force = arena.getSlopeForceAt(pos);

    // Force should point along negative X axis towards (0, 0)
    assert.ok(force.x < 0, 'Slope force must point toward center');
    assert.strictEqual(force.y, 0);
  });

  test('Arena detects knockout pocket entry', () => {
    const arena = new Arena({ RADIUS: 300, POCKET_COUNT: 4 });
    const pocket = arena.pockets[0];
    const isPocket = arena.isInPocket(pocket.position, 10);
    assert.strictEqual(isPocket, true);

    const isCenterPocket = arena.isInPocket(new Vector2(0, 0), 10);
    assert.strictEqual(isCenterPocket, false);
  });
});

describe('Engine: SpinningTop', () => {
  test('Spinning top launches with RPM and decays over time', () => {
    const top = new SpinningTop({ maxRpm: 8000 });
    top.launch(new Vector2(0, -100), new Vector2(50, 0), 8000);

    assert.strictEqual(top.isAlive, true);
    assert.strictEqual(top.rpm, 8000);

    const arena = new Arena();
    top.update(0.1, arena);
    assert.ok(top.rpm < 8000, 'RPM should decay during simulation');
  });

  test('Spinning top suffers burst damage and registers burst state', () => {
    const top = new SpinningTop({ burstResistance: 50 });
    top.launch(new Vector2(0, 0), new Vector2(0, 0), 8000);

    const burst = top.takeDamage(1000);
    assert.strictEqual(burst, true);
    assert.strictEqual(top.isBurst, true);
    assert.strictEqual(top.isAlive, false);
  });
});

describe('Engine: PhysicsWorld & GameEngine', () => {
  test('Resolves top-to-top collision and emits event', () => {
    const arena = new Arena();
    const world = new PhysicsWorld(arena);

    const topA = new SpinningTop({ id: 'topA', radius: 25 });
    const topB = new SpinningTop({ id: 'topB', radius: 25 });

    topA.launch(new Vector2(-10, 0), new Vector2(100, 0), 8000);
    topB.launch(new Vector2(10, 0), new Vector2(-100, 0), 8000);

    world.addTop(topA);
    world.addTop(topB);

    let collisionEventReceived = false;
    world.onEvent((e) => {
      if (e.type === 'top_collision') {
        collisionEventReceived = true;
      }
    });

    world.step(0.016);
    assert.strictEqual(collisionEventReceived, true, 'Collision event should be triggered');
  });

  test('GameEngine registers and clears tops', () => {
    const engine = new GameEngine();
    const top = new SpinningTop({ id: 'test_top' });

    engine.registerTop(top);
    assert.strictEqual(engine.getTops().length, 1);

    engine.unregisterTop(top);
    assert.strictEqual(engine.getTops().length, 0);
  });
});

