/**
 * SPINFORGE - Engine Constants & Archetypes
 * Central definitions for physics parameters, arena specs, stamina decay, and battle mechanics.
 */

export const TICK_RATE = 60;
export const FIXED_TIMESTEP = 1 / TICK_RATE; // ~0.016667 seconds
export const PHYSICS_SUBSTEPS = 2; // Substepping for tunneling prevention & collision accuracy

export const PHYSICS_LIMITS = {
  MAX_LINEAR_SPEED: 850, // Maximum velocity magnitude (pixels/sec)
  MAX_RPM: 12000,
  MIN_ACTIVE_RPM: 350,  // Destabilization cutoff
  MIN_SEPARATION_DIST: 0.0001,
};

export const ARENA_DEFAULTS = {
  RADIUS: 300,
  CENTER_X: 0,
  CENTER_Y: 0,
  DEPTH_SLOPE: 135, // Gravitational acceleration toward center at rim edge
  WALL_RESTITUTION: 0.72, // Bounciness of outer rim
  WALL_FRICTION: 0.82,
  POCKET_COUNT: 4,
  POCKET_RADIUS: 38,
  POCKET_OFFSET_RATIO: 0.94,
  SURFACE_FRICTION: 0.12,
  OUT_OF_BOUNDS_MARGIN: 25, // Distance beyond rim for over-finish ring-out
};

export const TOP_DEFAULTS = {
  RADIUS: 28,
  MASS: 1.0,
  DEFAULT_MAX_RPM: 8000,
  MIN_ACTIVE_RPM: 350,
  BURST_RESISTANCE: 100, // Durability HP pool before bursting
  COLLISION_ELASTICITY: 0.78, // Baseline restitution between tops
  SPIN_CLASH_COEFFICIENT: 0.42, // Angular friction coefficient at blade contact

  // Stamina decay coefficients
  BASE_SPIN_DECAY: 180, // Base RPM decay per second
  AIR_DRAG_COEFF: 0.004, // Proportional to RPM
  SURFACE_SPEED_DRAG: 0.002, // Extra spin loss when moving fast
  SCRAPE_DRAG_MULTIPLIER: 4.5, // Accelerated spin loss when wobbling/scraping floor
  WOBBLE_THRESHOLD_RPM: 2400, // Precession wobble starts below this RPM
};

export const TOP_ARCHETYPES = {
  ATTACK: 'attack',
  DEFENSE: 'defense',
  STAMINA: 'stamina',
  BALANCE: 'balance',
};

export const FINISH_TYPES = {
  SPIN_FINISH: 'SPIN_FINISH',     // Out-spun opponent (1 pt)
  OVER_FINISH: 'OVER_FINISH',     // Knocked into stadium pocket (2 pts)
  RING_OUT: 'RING_OUT',           // Knocked over stadium rim (2 pts)
  BURST_FINISH: 'BURST_FINISH',   // Burst resistance depleted by impact (3 pts)
  DRAW: 'DRAW',                   // Simultaneous double elimination (0 pts, replay)
};

export const FINISH_POINTS = {
  [FINISH_TYPES.SPIN_FINISH]: 1,
  [FINISH_TYPES.OVER_FINISH]: 2,
  [FINISH_TYPES.RING_OUT]: 2,
  [FINISH_TYPES.BURST_FINISH]: 3,
  [FINISH_TYPES.DRAW]: 0,
};

export const BATTLE_RULES = {
  POINTS_TO_WIN: 3,
  SIMULTANEOUS_THRESHOLD_SEC: 0.08, // Grace window for simultaneous elimination
  MAX_ROUND_DURATION_SEC: 60, // Maximum round length before timeout decision
};
