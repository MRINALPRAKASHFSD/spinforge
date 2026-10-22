/**
 * SPINFORGE - PartRegistry
 * Catalog of customizable spinning-top components: Energy Layers, Weight Discs, and Performance Drivers.
 */

export const PART_TYPES = {
  LAYER: 'layer',
  DISC: 'disc',
  DRIVER: 'driver',
};

export const LAYERS = [
  {
    id: 'layer_vortex_wing',
    name: 'Vortex Wing',
    archetype: 'attack',
    bladePoints: 3,
    attack: 85,
    defense: 35,
    stamina: 45,
    weight: 22,
    primaryColor: '#00e5ff',
    accentColor: '#f43f5e',
    coreColor: '#38bdf8',
    description: 'Tri-wing aggressive aerodynamic blades designed for ferocious perimeter strikes.',
  },
  {
    id: 'layer_aegis_shield',
    name: 'Aegis Shield',
    archetype: 'defense',
    bladePoints: 6,
    attack: 40,
    defense: 90,
    stamina: 60,
    weight: 28,
    primaryColor: '#10b981',
    accentColor: '#047857',
    coreColor: '#6ee7b7',
    description: 'Hexagonal reinforced barrier with circular deflector ramparts to absorb heavy impacts.',
  },
  {
    id: 'layer_solar_stamina',
    name: 'Solar Corona',
    archetype: 'stamina',
    bladePoints: 4,
    attack: 35,
    defense: 50,
    stamina: 95,
    weight: 20,
    primaryColor: '#f59e0b',
    accentColor: '#d97706',
    coreColor: '#fbbf24',
    description: 'Smooth perimeter geometry minimizing air drag for prolonged rotational endurance.',
  },
  {
    id: 'layer_phantom_balance',
    name: 'Phantom Cross',
    archetype: 'balance',
    bladePoints: 4,
    attack: 65,
    defense: 65,
    stamina: 65,
    weight: 24,
    primaryColor: '#a855f7',
    accentColor: '#ec4899',
    coreColor: '#c084fc',
    description: 'Balanced quad-blade layout adaptable to both offensive rushes and defensive holds.',
  },
];

export const DISCS = [
  {
    id: 'disc_heavy_forge',
    name: 'Heavy Forge 00',
    weight: 34,
    stabilityBonus: 15,
    burstResistanceBonus: 20,
    description: 'Dense tungsten-infused disc concentrating mass around the perimeter for gyroscopic stability.',
  },
  {
    id: 'disc_aerocross',
    name: 'Aero Cross',
    weight: 26,
    stabilityBonus: 8,
    burstResistanceBonus: 10,
    description: 'Lightweight channeled cross disc providing sharp acceleration and rapid directional changes.',
  },
  {
    id: 'disc_vanguard',
    name: 'Vanguard Ring',
    weight: 30,
    stabilityBonus: 12,
    burstResistanceBonus: 15,
    description: 'Symmetric steel ring optimizing balance between impact force and stamina longevity.',
  },
];

export const DRIVERS = [
  {
    id: 'driver_accel_flat',
    name: 'Accel Flat',
    archetype: 'attack',
    speedMultiplier: 1.35,
    staminaMultiplier: 0.75,
    grip: 0.8,
    description: 'Wide flat rubber tip inducing aggressive, wide-sweeping orbital trajectories.',
  },
  {
    id: 'driver_needle_sharp',
    name: 'Needle Sharp',
    archetype: 'stamina',
    speedMultiplier: 0.65,
    staminaMultiplier: 1.45,
    grip: 0.2,
    description: 'Micro-point low-friction needle tip anchoring the top solidly in the arena center bowl.',
  },
  {
    id: 'driver_ball_defend',
    name: 'Ball Guard',
    archetype: 'defense',
    speedMultiplier: 0.9,
    staminaMultiplier: 1.1,
    grip: 0.5,
    description: 'Spherical metal ball tip deflecting incoming impulses and restoring equilibrium.',
  },
];

