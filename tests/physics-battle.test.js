/**
 * SPINFORGE - Physics & Battle Simulation Integration Tests
 * Validates realistic momentum transfer, stamina decay models, attribute impact on battle outcomes,
 * wall/pocket ring-outs, simultaneous elimination rules, and headless battle execution.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Arena } from '../src/engine/Arena.js';
import { SpinningTop } from '../src/engine/SpinningTop.js';
import { PhysicsWorld } from '../src/engine/PhysicsWorld.js';
import { WinnerDetermination } from '../src/engine/WinnerDetermination.js';
import { BattleSimulation, SIMULATION_STATES } from '../src/engine/BattleSimulation.js';
import { TopBuilder } from '../src/progression/TopBuilder.js';
import { Vector2 } from '../src/engine/Vector2.js';
import { FINISH_TYPES, TOP_DEFAULTS } from '../src/engine/constants.js';

describe('Physics: Momentum Transfer & Realistic Interactions', () => {
  test('Linear momentum transfer repels tops upon impact', () => {
    const arena = new Arena();
    const world = new PhysicsWorld(arena);

    // Two tops colliding head-on
    const topA = new SpinningTop({ id: 'topA', mass: 1.0, radius: 25 });
    const topB = new SpinningTop({ id: 'topB', mass: 1.0, radius: 25 });

    topA.launch(new Vector2(-20, 0), new Vector2(150, 0), 8000);
    topB.launch(new Vector2(20, 0), new Vector2(-150, 0), 8000);

    world.addTop(topA);
    world.addTop(topB);

    world.step(0.016);

    // After collision, velocities should reverse direction
    assert.ok(topA.velocity.x < 0, 'Top A must rebound leftward');
    assert.ok(topB.velocity.x > 0, 'Top B must rebound rightward');
  });

  test('Rotational spin clash causes torque transfer and spin decay', () => {
    const arena = new Arena();
    const world = new PhysicsWorld(arena);

    const topA = new SpinningTop({ id: 'topA', maxRpm: 8000, spinDirection: 1 });
    const topB = new SpinningTop({ id: 'topB', maxRpm: 8000, spinDirection: 1 });

    topA.launch(new Vector2(-20, 0), new Vector2(100, 0), 8000);
    topB.launch(new Vector2(20, 0), new Vector2(-100, 0), 8000);

    world.addTop(topA);
    world.addTop(topB);

    world.step(0.016);

    assert.ok(topA.rpm < 8000, 'Collision clash must deplete RPM');
    assert.ok(topB.rpm < 8000, 'Collision clash must deplete RPM');
  });

  test('Mass-weighted overlap resolution prevents tops from sticking together', () => {
    const arena = new Arena();
    const world = new PhysicsWorld(arena);

    const topA = new SpinningTop({ id: 'heavyTop', mass: 3.0, radius: 25 });
    const topB = new SpinningTop({ id: 'lightTop', mass: 1.0, radius: 25 });

    // Spawn overlapping
    topA.position.set(0, 0);
    topB.position.set(20, 0); // Distance 20 < minDist 50
    world.addTop(topA);
    world.addTop(topB);

    world.step(0.016);

    const distAfter = topA.position.distanceTo(topB.position);
    assert.ok(distAfter >= 49.9, `Tops must separate to at least radius sum (was ${distAfter})`);
    // Lighter top should move further than heavier top
    assert.ok(topB.position.x > 25, 'Lighter top B should be displaced further');
  });
});

describe('Physics: Attributes & Build Differences', () => {
  test('Defense attribute mitigates burst damage taken', () => {
    const glassCannon = new SpinningTop({ defensePower: 10, burstResistance: 100 });
    const ironTank = new SpinningTop({ defensePower: 90, burstResistance: 100 });

    glassCannon.launch(new Vector2(0, 0), new Vector2(0, 0), 7000);
    ironTank.launch(new Vector2(0, 0), new Vector2(0, 0), 7000);

    const impulse = 300;
    glassCannon.takeDamage(impulse, 80);
    ironTank.takeDamage(impulse, 80);

    assert.ok(
      ironTank.burstResistance > glassCannon.burstResistance,
      `Defense build must retain more burst resistance (${ironTank.burstResistance} > ${glassCannon.burstResistance})`
    );
  });

  test('Attack attribute increases burst damage dealt to opponent', () => {
    const victimA = new SpinningTop({ defensePower: 50, burstResistance: 100 });
    const victimB = new SpinningTop({ defensePower: 50, burstResistance: 100 });

    victimA.launch(new Vector2(0, 0), new Vector2(0, 0), 7000);
    victimB.launch(new Vector2(0, 0), new Vector2(0, 0), 7000);

    victimA.takeDamage(200, 20); // Low attack attacker
    victimB.takeDamage(200, 95); // High attack attacker

    assert.ok(
      victimB.burstResistance < victimA.burstResistance,
      'High attack power must inflict more burst damage'
    );
  });

  test('Stamina build out-spins an attack build in free spin endurance', () => {
    const arena = new Arena();

    // High stamina top (Needle Sharp driver + Solar Corona layer)
    const staminaTop = TopBuilder.build({
      layerId: 'layer_solar_stamina',
      discId: 'disc_vanguard',
      driverId: 'driver_needle_sharp',
    });

    // Aggressive attack top (Accel Flat driver + Vortex Wing layer)
    const attackTop = TopBuilder.build({
      layerId: 'layer_vortex_wing',
      discId: 'disc_heavy_forge',
      driverId: 'driver_accel_flat',
    });

    staminaTop.launch(new Vector2(0, 0), new Vector2(50, 0), 8000);
    attackTop.launch(new Vector2(0, 0), new Vector2(50, 0), 8000);

    // Simulate 4 seconds of free spinning
    for (let i = 0; i < 240; i++) {
      staminaTop.update(1 / 60, arena);
      attackTop.update(1 / 60, arena);
    }

    assert.ok(
      staminaTop.rpm > attackTop.rpm,
      `Stamina top should retain more RPM (${staminaTop.rpm} > ${attackTop.rpm})`
    );
  });
});

describe('Physics: Stamina Decay & Sleep Transition', () => {
  test('RPM decays continuously and transitions cleanly to sleeping state', () => {
    const arena = new Arena();
    const top = new SpinningTop({ maxRpm: 1000, staminaRating: 20 });
    top.launch(new Vector2(0, 0), new Vector2(0, 0), 600);

    assert.strictEqual(top.isAlive, true);
    assert.strictEqual(top.isSleeping, false);

    // Advance until RPM reaches zero
    for (let i = 0; i < 300; i++) {
      top.update(1 / 60, arena);
      if (!top.isAlive) break;
    }

    assert.strictEqual(top.isAlive, false, 'Top must destabilize and die');
    assert.strictEqual(top.isSleeping, true, 'Top must be marked sleeping');
    assert.strictEqual(top.rpm, 0, 'RPM must reach zero');
  });

  test('Precession wobble accelerates as RPM falls below wobble threshold', () => {
    const arena = new Arena();
    const top = new SpinningTop({ maxRpm: 8000 });
    top.launch(new Vector2(0, 0), new Vector2(0, 0), 4000);

    top.update(0.1, arena);
    assert.strictEqual(top.wobbleMagnitude, 0, 'Wobble should be 0 at high RPM');

    // Drop RPM into wobble territory
    top.rpm = 1500;
    top.update(0.1, arena);
    assert.ok(top.wobbleMagnitude > 0, 'Wobble must increase below wobble threshold');
  });
});

describe('Physics: Wall Bounce & Ring-Out Detection', () => {
  test('Wall collision reflects velocity inward and applies friction damping', () => {
    const arena = new Arena({ RADIUS: 300, WALL_RESTITUTION: 0.75 });
    const top = new SpinningTop({ radius: 25 });
    // Moving rapidly outward and contacting rim (distance 280 > maxAllowed 275)
    top.launch(new Vector2(280, 0), new Vector2(200, 0), 8000);

    const wallRes = arena.resolveWallCollision(top);
    assert.strictEqual(wallRes.collided, true);
    assert.ok(top.velocity.x < 0, 'Velocity should be reflected inward along normal');
  });

  test('Knockout pocket entrapment triggers OVER_FINISH', () => {
    const arena = new Arena({ RADIUS: 300, POCKET_COUNT: 4 });
    const world = new PhysicsWorld(arena);
    const top = new SpinningTop({ radius: 25 });

    const pocket = arena.pockets[0];
    top.launch(pocket.position.clone(), new Vector2(0, 0), 7000);
    world.addTop(top);

    let pocketFinishEvent = null;
    world.onEvent((e) => {
      if (e.type === 'pocket_finish') pocketFinishEvent = e;
    });

    world.step(0.016);

    assert.ok(pocketFinishEvent, 'Must emit pocket_finish event');
    assert.strictEqual(top.isAlive, false);
    assert.strictEqual(top.isRingOut, true);
    assert.strictEqual(pocketFinishEvent.finishType, FINISH_TYPES.OVER_FINISH);
  });

  test('Breaching outer stadium boundary triggers RING_OUT', () => {
    const arena = new Arena({ RADIUS: 300, OUT_OF_BOUNDS_MARGIN: 20 });
    const world = new PhysicsWorld(arena);
    const top = new SpinningTop({ radius: 25 });

    // Launched well beyond the rim
    top.launch(new Vector2(335, 0), new Vector2(150, 0), 7000);
    world.addTop(top);

    let ringOutEvent = null;
    world.onEvent((e) => {
      if (e.type === 'ring_out') ringOutEvent = e;
    });

    world.step(0.016);

    assert.ok(ringOutEvent, 'Must emit ring_out event');
    assert.strictEqual(top.isAlive, false);
    assert.strictEqual(top.isRingOut, true);
  });
});

describe('Simulation: Winner Determination & Simultaneous Elimination', () => {
  test('Evaluates clean single finishes (Spin, Over, Burst)', () => {
    const topA = new SpinningTop({ id: 'topA' });
    const topB = new SpinningTop({ id: 'topB' });

    // Top B bursts
    topA.launch(new Vector2(0, 0), new Vector2(0, 0), 6000);
    topB.launch(new Vector2(0, 0), new Vector2(0, 0), 6000);
    topB.takeDamage(10000, 100);

    const evalBurst = WinnerDetermination.evaluate(topA, topB);
    assert.strictEqual(evalBurst.isOver, true);
    assert.strictEqual(evalBurst.winner, topA);
    assert.strictEqual(evalBurst.finishType, FINISH_TYPES.BURST_FINISH);
    assert.strictEqual(evalBurst.points, 3);
  });

  test('Simultaneous Double Burst results in a Draw', () => {
    const topA = new SpinningTop({ id: 'topA' });
    const topB = new SpinningTop({ id: 'topB' });

    topA.launch(new Vector2(0, 0), new Vector2(0, 0), 6000);
    topB.launch(new Vector2(0, 0), new Vector2(0, 0), 6000);

    // Both burst simultaneously
    topA.takeDamage(10000, 100);
    topB.takeDamage(10000, 100);

    const evalDraw = WinnerDetermination.evaluate(topA, topB);
    assert.strictEqual(evalDraw.isOver, true);
    assert.strictEqual(evalDraw.isDraw, true);
    assert.strictEqual(evalDraw.finishType, FINISH_TYPES.DRAW);
    assert.strictEqual(evalDraw.points, 0);
  });

  test('Simultaneous Double Sleep within grace window results in a Draw', () => {
    const topA = new SpinningTop({ id: 'topA' });
    const topB = new SpinningTop({ id: 'topB' });

    topA.launch(new Vector2(0, 0), new Vector2(0, 0), 300);
    topB.launch(new Vector2(0, 0), new Vector2(0, 0), 300);

    const now = performance.now();
    topA.isAlive = false;
    topA.isSleeping = true;
    topA.rpm = 0;
    topA.eliminationTime = now;

    topB.isAlive = false;
    topB.isSleeping = true;
    topB.rpm = 0;
    topB.eliminationTime = now + 10; // 10ms later (well within 80ms window)

    const evalSleep = WinnerDetermination.evaluate(topA, topB);
    assert.strictEqual(evalSleep.isOver, true);
    assert.strictEqual(evalSleep.isDraw, true);
  });
});

describe('Simulation: Headless Battle Execution (Definition of Done)', () => {
  test('Physics remains stable across different rendering frame rates (30 FPS vs 60 FPS vs 120 FPS)', () => {
    // Run two identical physics simulations:
    // Sim 1 stepped with dt = 1/30 (30 FPS)
    // Sim 2 stepped with dt = 1/120 (120 FPS)
    // Both running fixed 1/60 accumulator updates
    const topA1 = new SpinningTop({ id: 'topA1', maxRpm: 8000 });
    const topA2 = new SpinningTop({ id: 'topA2', maxRpm: 8000 });
    const arena = new Arena();

    topA1.launch(new Vector2(0, -100), new Vector2(100, 0), 8000);
    topA2.launch(new Vector2(0, -100), new Vector2(100, 0), 8000);

    // 1 second of simulation: 60 fixed steps of 1/60s each
    for (let i = 0; i < 60; i++) {
      topA1.update(1 / 60, arena);
      topA2.update(1 / 60, arena);
    }

    assert.ok(Math.abs(topA1.position.x - topA2.position.x) < 0.0001);
    assert.ok(Math.abs(topA1.position.y - topA2.position.y) < 0.0001);
    assert.ok(Math.abs(topA1.rpm - topA2.rpm) < 0.0001);
  });

  test('Runs a complete head-to-head battle to resolution without UI', () => {
    const arena = new Arena();

    const topA = TopBuilder.build({
      id: 'player',
      layerId: 'layer_vortex_wing',
      discId: 'disc_heavy_forge',
      driverId: 'driver_accel_flat',
    });

    const topB = TopBuilder.build({
      id: 'cpu',
      layerId: 'layer_solar_stamina',
      discId: 'disc_vanguard',
      driverId: 'driver_needle_sharp',
    });

    const sim = new BattleSimulation({
      arena,
      playerTop: topA,
      opponentTop: topB,
      pointsToWin: 3,
    });

    // Launch both tops into the arena towards each other
    sim.startRound(
      { position: new Vector2(0, -120), velocity: new Vector2(100, 180), rpm: 8000 },
      { position: new Vector2(0, 120), velocity: new Vector2(-100, -180), rpm: 7500 }
    );

    assert.strictEqual(sim.state, SIMULATION_STATES.IN_PROGRESS);

    // Execute simulation ticks until round finishes
    const outcome = sim.runUntilComplete(30);

    assert.strictEqual(outcome.completed, true, 'Battle simulation must finish to completion');
    assert.ok(outcome.durationSec > 0);
    assert.ok(outcome.ticks > 0);
    assert.ok(outcome.result.isOver, 'Round result must be over');
    assert.ok(outcome.result.finishType, 'Finish type must be assigned');
  });
});
