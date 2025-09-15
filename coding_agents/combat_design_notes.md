Here’s the full updated TypeScript module—paste it in as a single file. It expands the Part type to cover our new mechanics, preserves your existing data, and appends the new tech we aligned on. Top comment documents the design philosophy and principles.

/**
 * Eclipse-like Roguelike — Tech Data & Types
 * ---------------------------------------------------------
 * Design philosophy & principles
 * 1) Binary damage model: each ❤️ absorbs exactly one hit. Avoid “free damage” loops.
 * 2) Two functional branches:
 *    - Support & Defense: sources, drives, hull, shields, computers, and economy modifiers.
 *    - Offense & Proactive: weapons, beams, variance (rift), fleet synergies.
 *    Military/frame upgrades are handled elsewhere (ship frames, slots, capacity).
 * 3) Strategic tradeoffs > flat power:
 *    - Slot tax (⬛⬛) for high-impact parts.
 *    - Experimental/overtuned parts trade cost/power for shop-risk (destroy/downgrade chances).
 *    - Fleet & build synergies (per-ship, per-unique-weapon, per-reroll) promote diverse runs.
 *    - Reactive triggers (on-block, on-death) are swingy but bounded (chance gates, round limits).
 * 4) Fight length awareness: bosses can stretch to 10–20 rounds → allow slow-burn value (corrosion,
 *    attrition, initiative manipulation) without invalidating hull as the premium stat.
 * 5) Simplicity of execution: new fields are declarative flags/percents. Core loop stays initiative-ordered;
 *    beams/statuses are encoded as data, resolved by lightweight rules in combat.
 */

// =========================
// Types
// =========================

export type TechTrack = 'Military' | 'Grid' | 'Nano';
export type PartCategory = 'Source' | 'Drive' | 'Weapon' | 'Computer' | 'Shield' | 'Hull';

export type DieFace = {
  roll?: number; // success threshold face, if used by your resolver
  dmg?: number;  // damage on this face
  self?: number; // self-damage (rift backlash etc.)
};

export type Part = {
  // ----- existing -----
  id: string;
  name: string;
  desc?: string;
  powerProd?: number;
  powerCost?: number;
  init?: number;
  dice?: number;
  dmgPerHit?: number;
  riftDice?: number;
  faces?: DieFace[];
  shieldTier?: number;
  extraHull?: number;
  aim?: number;
  initLoss?: number;
  regen?: number;
  slots?: number;
  tier: number;
  cost: number;
  tech_category: TechTrack;
  cat: PartCategory;
  rare?: boolean;

  // ----- new: identity/semantics -----
  tags?: string[]; // e.g., ["experimental","beam","econ","magnet","retaliatory"]

  // ----- new: targeting/aggro -----
  magnet?: boolean; // enemies prioritize this ship if possible

  // ----- new: economy/shop interactions -----
  econDiscountPct?: number;        // e.g., Bargain Plasma: 10 → -10% shop prices while installed
  destroyOnRerollPct?: number;     // % chance to be destroyed on each shop reroll
  destroyOnPurchasePct?: number;   // % chance to be destroyed whenever ANY shop item is purchased
  downgradeOnRerollPct?: number;   // % chance to lose 1 point of a stat on reroll
  downgradeAffects?: 'init' | 'shieldTier' | 'aim' | 'powerProd' | 'dice' | 'dmgPerHit';
  downgradeMin?: number;           // floor for the downgraded stat

  // ----- new: retaliatory / on-block / on-death effects -----
  retaliatory?: boolean;
  dealDamageOnDeathDieThreshold?: number; // 5 → on 5–6, deal 1 damage to attacker
  dealDamageOnBlockDieThreshold?: number; // 6 → on block, on die roll 6, deal 1 back
  grantShieldOnDeathTier?: number;        // grant allies this shield tier on death
  grantShieldOnDeathRounds?: number;      // duration of the above
  initLossOnBlock?: number;               // attacker loses this much initiative on block

  // ----- new: beams / status-likes -----
  lowerShieldOnHit?: number;        // Entropy Beam: reduce enemy shield tier by N this round
  corrosionOnHit?: boolean;         // Corrosive Beam: apply corrosion stack
  corrosionDamagePerStack?: number; // damage each enemy turn per stack

  // ----- new: variance / rerolls / chaining -----
  rerollOnMissPct?: number;   // chance to immediately reroll a missed die
  chainOnHit?: boolean;       // Recursive Array: on hit, roll this weapon again
  chainDamageDecay?: number;  // damage reduction per chained hit
  chainMinDamage?: number;    // minimum damage per chained hit

  // ----- new: conditional buffs -----
  aimBuffNextRoundOnSelfHit?: number; // Volatile Cannon: +1 Aim to allies next round on self-hit
  oncePerCombat?: boolean;            // Target Painter style switches
  designateTargetAlliesBonusDamage?: number;
  designateDurationRounds?: number;

  // ----- new: fleet/build synergies -----
  dicePerShip?: number;          // Fleetfire: +1 die per other ship
  dicePerUniqueWeapon?: number;  // Hexfire: +1 die per unique weapon type on this ship
  dicePerReroll?: number;        // Reroll Railgun: +1 die per shop reroll this run

  // ----- new: between-fight actions -----
  scrapBetweenFightsDamage?: number; // Consumptive Hull: guarantee damage next fight if scrapped
};

export type PartCatalog = {
  sources: Part[];
  drives: Part[];
  weapons: Part[];
  computers: Part[];
  shields: Part[];
  hull: Part[];
  rare: Part[];
};

// =========================
// Shared faces / symbols
// =========================

export const RIFT_FACES: DieFace[] = [
  { dmg: 1 },
  { dmg: 2 },
  { dmg: 3, self: 1 },
  { self: 1 },
  {},
  {},
] as const;

// =========================
// Rares (existing + new)
// =========================

export const RARE_PARTS: Part[] = [
  // --- existing rares ---
  { id: "spike_launcher", name: "Spike Launcher", dice: 1, dmgPerHit: 3, faces: [ { roll: 0 }, { roll: 0 }, { roll: 0 }, { roll: 0 }, { roll: 0 }, { dmg: 3 } ], powerCost: 1, tier: 1, cost: 30, cat: "Weapon", tech_category: "Nano", rare: true, desc: "One die: only a 6 hits for 3 damage. Aim and computers don't help." },
  { id: "rift_cannon", name: "Rift Cannon", riftDice: 1, faces: RIFT_FACES, powerCost: 2, tier: 2, cost: 65, cat: "Weapon", tech_category: "Nano", rare: true, desc: "Rolls one Rift die for 1-3 damage. A 3 also deals 1 damage to you. Aim and computers don't help." },
  { id: "sentient_hull", name: "Sentient Hull", extraHull: 1, aim: 1, powerCost: 0, tier: 2, cost: 50, cat: "Computer", tech_category: "Nano", rare: true, desc: "Adds 1 hull and +1 Aim with no power cost." },
  { id: "absorption", name: "Absorption Shield", shieldTier: 1, powerProd: 4, tier: 2, cost: 65, cat: "Shield", tech_category: "Nano", rare: true, desc: "Shield tier 1 that also generates 4 power."},
  { id: "quantum_cpu", name: "Quantum Computer", aim: 2, powerCost: 1, tier: 2, cost: 70, cat: "Computer", tech_category: "Grid", rare: true, desc: "Adds +2 Aim for only 1 power."},
  { id: "rift_conductor", name: "Rift Conductor", extraHull: 1, riftDice: 1, powerCost: 1, tier: 2, cost: 40, cat: "Hull", tech_category: "Nano", rare: true, desc: "Adds 1 hull and rolls a Rift die (1-3 damage; a 3 also hits you for 1). Aim and computers don't help."},
  { id: "disruptor", name: "Disruptor Beam", dice: 1, dmgPerHit: 0, faces: [ { roll: 6 } ], powerCost: 1, tier: 2, cost: 80, cat: "Weapon", tech_category: "Nano", initLoss: 1, rare: true, desc: "Always hits and lowers enemy initiative by 1 without dealing damage." },
  { id: "disruptor_cannon", name: "Disruptor Cannon", dice: 1, dmgPerHit: 1, faces: [ { roll: 1 }, { roll: 2 }, { roll: 3 }, { roll: 4 }, { roll: 5 }, { dmg: 1 } ], powerCost: 2, tier: 2, cost: 90, cat: "Weapon", tech_category: "Nano", initLoss: 1, rare: true, desc: "Rolls 1 die; hits deal 1 damage and lower enemy initiative by 1." },
  { id: "auto_repair", name: "Auto-Repair Hull", extraHull: 2, regen: 1, powerCost: 1, tier: 2, cost: 80, cat: "Hull", tech_category: "Nano", rare: true, desc: "Adds 2 hull and regenerates 1 each round; uses 1 power." },

  // --- new rares ---
  { id: "guardian_shield", name: "Guardian Shield", shieldTier: 1, powerCost: 1, tier: 2, cost: 85, cat: "Shield", tech_category: "Nano", rare: true, grantShieldOnDeathTier: 1, grantShieldOnDeathRounds: 2, desc: "Tier 1 shield. On death: all allies gain shield tier 1 for 2 rounds (randomly assigned if needed)." },
  { id: "entropy_shield", name: "Entropy Shield", shieldTier: 2, powerCost: 2, tier: 2, cost: 95, cat: "Shield", tech_category: "Nano", rare: true, retaliatory: true, initLossOnBlock: 1, desc: "Tier 2 shield. When this ship blocks, the attacker loses 1 initiative." },
  { id: "unity_hull", name: "Unity Hull", extraHull: 2, powerCost: 0, tier: 2, cost: 85, cat: "Hull", tech_category: "Nano", rare: true, desc: "+2 hull. Once per combat when another ally dies, gain +1 hull." },
  { id: "consumptive_hull", name: "Consumptive Hull", extraHull: 2, powerCost: 0, tier: 2, cost: 90, cat: "Hull", tech_category: "Nano", rare: true, scrapBetweenFightsDamage: 1, desc: "+2 hull. Between fights, you may scrap this to deal 1 guaranteed damage at the start of the next battle." },
  { id: "corrosive_beam", name: "Corrosive Beam", dice: 1, dmgPerHit: 0, faces: [ { roll: 6 } ], powerCost: 2, tier: 2, cost: 100, cat: "Weapon", tech_category: "Nano", rare: true, corrosionOnHit: true, corrosionDamagePerStack: 1, tags: ["beam"], desc: "Deals no immediate damage. On hit, apply a corrosion counter; at the start of each enemy turn they take 1 damage per counter (stacks)." },
  { id: "target_painter_beam", name: "Target Painter Beam", dice: 1, dmgPerHit: 0, faces: [ { roll: 6 } ], powerCost: 1, tier: 2, cost: 95, cat: "Weapon", tech_category: "Nano", rare: true, oncePerCombat: true, designateTargetAlliesBonusDamage: 1, designateDurationRounds: 1, tags: ["beam"], desc: "Once per combat: designate the target; all hits against it this round deal +1 damage." },
  { id: "recursive_array_mk2", name: "Recursive Array Mk II", dice: 1, dmgPerHit: 2, faces: [ { roll: 1 }, { roll: 2 }, { roll: 3 }, { roll: 4 }, { roll: 5 }, { dmg: 2 } ], powerCost: 2, tier: 3, cost: 140, cat: "Weapon", tech_category: "Nano", slots: 2, rare: true, chainOnHit: true, chainDamageDecay: 1, chainMinDamage: 1, desc: "On hit, roll again; each chained hit deals -1 damage (min 1)." },
  { id: "recursive_array_mk3", name: "Recursive Array Mk III", dice: 2, dmgPerHit: 2, faces: [ { roll: 1 }, { roll: 2 }, { roll: 3 }, { roll: 4 }, { roll: 5 }, { dmg: 2 } ], powerCost: 3, tier: 3, cost: 180, cat: "Weapon", tech_category: "Nano", slots: 2, rare: true, chainOnHit: true, chainDamageDecay: 1, chainMinDamage: 1, desc: "Roll 2 dice. On any hit, chain additional rolls; each chained hit deals -1 damage (min 1)." },
  { id: "reroll_railgun", name: "Reroll Railgun", dice: 1, dmgPerHit: 1, faces: [ { roll: 1 }, { roll: 2 }, { roll: 3 }, { roll: 4 }, { roll: 5 }, { dmg: 1 } ], powerCost: 2, tier: 2, cost: 100, cat: "Weapon", tech_category: "Nano", rare: true, dicePerReroll: 1, desc: "Starts with 1 die. Gains +1 die for each shop reroll you’ve performed during this run." }
];

// =========================
// Normal catalog (existing + new)
// =========================

export const PARTS: PartCatalog = {
  sources: [
    { id: "fusion_source", name: "Fusion Source", powerProd: 3, tier: 1, cost: 18, cat: "Source", tech_category: "Grid", desc: "Produces 3 power." },
    { id: "tachyon_source", name: "Tachyon Source", powerProd: 6, tier: 2, cost: 60, cat: "Source", tech_category: "Grid", desc: "Produces 6 power." },
    { id: "quantum_source", name: "Quantum Source", powerProd: 9, tier: 3, cost: 120, cat: "Source", tech_category: "Grid", desc: "Generates 9 power." },
    { id: "micro_fusion", name: "Micro Fusion", powerProd: 2, tier: 1, cost: 12, cat: "Source", tech_category: "Grid", desc: "Small reactor that makes 2 power." },
    { id: "zero_point", name: "Zero-Point Source", powerProd: 12, tier: 3, cost: 150, cat: "Source", tech_category: "Grid", desc: "Generates 12 power." },

    // NEW
    { id: "discount_source", name: "Discount Source", powerProd: 4, powerCost: 0, tier: 2, cost: 35, cat: "Source", tech_category: "Grid", destroyOnRerollPct: 15, tags: ["experimental"], desc: "Generates 4 power at a bargain. Experimental: 15% chance to vanish each time you reroll the shop." }
  ],

  drives: [
    { id: "fusion_drive", name: "Fusion Drive", init: 1, powerCost: 1, tier: 1, cost: 18, cat: "Drive", tech_category: "Grid", desc: "Adds +1 initiative; uses 1 power." },
    { id: "tachyon_drive", name: "Tachyon Drive", init: 2, powerCost: 2, tier: 2, cost: 55, cat: "Drive", tech_category: "Grid", desc: "Adds +2 initiative; uses 2 power." },
    { id: "warp_drive", name: "Warp Drive", init: 3, powerCost: 3, tier: 2, cost: 95, cat: "Drive", tech_category: "Grid", desc: "Adds +3 initiative; uses 3 power." },
    { id: "ion_thruster", name: "Ion Thruster", init: 1, powerCost: 0, tier: 1, cost: 30, cat: "Drive", tech_category: "Grid", desc: "Adds +1 initiative with no power cost." },
    { id: "transition_drive", name: "Transition Drive", init: 3, powerCost: 2, tier: 3, cost: 120, cat: "Drive", tech_category: "Grid", desc: "Adds +3 initiative for 2 power." },

    // NEW
    { id: "overtuned_drive", name: "Overtuned Drive", init: 2, powerCost: 1, tier: 2, cost: 40, cat: "Drive", tech_category: "Grid", downgradeOnRerollPct: 20, downgradeAffects: "init", downgradeMin: 0, tags: ["experimental"], desc: "Adds +2 initiative for only 1 power. Experimental: 20% chance to downgrade by 1 initiative on each shop reroll (min +0)." }
  ],

  weapons: [
    { id: "plasma", name: "Plasma Cannon", dice: 1, dmgPerHit: 1, faces: [ { roll: 1 }, { roll: 2 }, { roll: 3 }, { roll: 4 }, { roll: 5 }, { dmg: 1 } ], powerCost: 1, tier: 1, cost: 25, cat: "Weapon", tech_category: "Nano", desc: "Rolls 1 die; hits deal 1 damage." },
    { id: "antimatter", name: "Antimatter Cannon", dice: 1, dmgPerHit: 2, faces: [ { roll: 1 }, { roll: 2 }, { roll: 3 }, { roll: 4 }, { roll: 5 }, { dmg: 2 } ], powerCost: 2, tier: 2, cost: 75, cat: "Weapon", tech_category: "Nano", desc: "Rolls 1 die; hits deal 2 damage." },
    { id: "singularity", name: "Singularity Cannon", dice: 1, dmgPerHit: 3, faces: [ { roll: 1 }, { roll: 2 }, { roll: 3 }, { roll: 4 }, { roll: 5 }, { dmg: 3 } ], powerCost: 3, tier: 3, cost: 120, cat: "Weapon", tech_category: "Nano", desc: "Rolls 1 die; hits deal 3 damage." },
    { id: "plasma_array", name: "Plasma Array", dice: 2, dmgPerHit: 1, faces: [ { roll: 1 }, { roll: 2 }, { roll: 3 }, { roll: 4 }, { roll: 5 }, { dmg: 1 } ], powerCost: 2, tier: 2, cost: 60, cat: "Weapon", tech_category: "Nano", desc: "Rolls 2 dice; each hit deals 1 damage." },
    { id: "plasma_battery", name: "Plasma Battery", dice: 3, dmgPerHit: 1, faces: [ { roll: 1 }, { roll: 2 }, { roll: 3 }, { roll: 4 }, { roll: 5 }, { dmg: 1 } ], powerCost: 3, tier: 3, cost: 140, cat: "Weapon", tech_category: "Nano", slots: 2, desc: "Rolls 3 dice; each hit deals 1 damage." },
    { id: "plasma_cluster", name: "Plasma Cluster", dice: 4, dmgPerHit: 1, faces: [ { roll: 1 }, { roll: 2 }, { roll: 3 }, { roll: 4 }, { roll: 5 }, { dmg: 1 } ], powerCost: 3, tier: 3, cost: 150, cat: "Weapon", tech_category: "Nano", slots: 2, desc: "Rolls 4 dice; each hit deals 1 damage." },
    { id: "antimatter_array", name: "Antimatter Array", dice: 2, dmgPerHit: 2, faces: [ { roll: 1 }, { roll: 2 }, { roll: 3 }, { roll: 4 }, { roll: 5 }, { dmg: 2 } ], powerCost: 4, tier: 3, cost: 150, cat: "Weapon", tech_category: "Nano", desc: "Rolls 2 dice; each hit deals 2 damage." },

    // NEW normals
    { id: "bargain_plasma", name: "Bargain Plasma", dice: 1, dmgPerHit: 1, faces: [ { roll: 1 }, { roll: 2 }, { roll: 3 }, { roll: 4 }, { roll: 5 }, { dmg: 1 } ], powerCost: 1, tier: 1, cost: 20, cat: "Weapon", tech_category: "Nano", econDiscountPct: 10, tags: ["econ"], desc: "Baseline plasma. While installed, all shop prices are reduced by 10%." },
    { id: "rebound_blaster", name: "Rebound Blaster", dice: 1, dmgPerHit: 1, faces: [ { roll: 1 }, { roll: 2 }, { roll: 3 }, { roll: 4 }, { roll: 5 }, { dmg: 1 } ], powerCost: 1, tier: 1, cost: 35, cat: "Weapon", tech_category: "Nano", rerollOnMissPct: 25, desc: "On miss: 25% chance to immediately reroll that die." },
    { id: "volatile_cannon", name: "Volatile Cannon", riftDice: 1, faces: RIFT_FACES, powerCost: 2, tier: 2, cost: 55, cat: "Weapon", tech_category: "Nano", aimBuffNextRoundOnSelfHit: 1, desc: "Rolls a Rift die. If it self-hits, all allies gain +1 Aim next round." },
    { id: "fleetfire_array", name: "Fleetfire Array", dice: 1, dmgPerHit: 1, faces: [ { roll: 1 }, { roll: 2 }, { roll: 3 }, { roll: 4 }, { roll: 5 }, { dmg: 1 } ], powerCost: 2, tier: 2, cost: 70, cat: "Weapon", tech_category: "Nano", dicePerShip: 1, desc: "Gains +1 die per other ship in your fleet at the start of combat." },
    { id: "hexfire_projector", name: "Hexfire Projector", dice: 1, dmgPerHit: 1, faces: [ { roll: 1 }, { roll: 2 }, { roll: 3 }, { roll: 4 }, { roll: 5 }, { dmg: 1 } ], powerCost: 2, tier: 2, cost: 75, cat: "Weapon", tech_category: "Nano", dicePerUniqueWeapon: 1, desc: "Gains +1 die per different weapon type on this ship." },
    { id: "entropy_beam", name: "Entropy Beam", dice: 1, dmgPerHit: 0, faces: [ { roll: 6 } ], powerCost: 1, tier: 2, cost: 60, cat: "Weapon", tech_category: "Nano", lowerShieldOnHit: 1, tags: ["beam"], desc: "Utility beam. Always hits; lowers enemy shield tier by 1 this round (no damage)." },
    { id: "volatile_array", name: "Volatile Array", dice: 3, dmgPerHit: 1, faces: [ { roll: 1 }, { roll: 2 }, { roll: 3 }, { roll: 4 }, { roll: 5 }, { dmg: 1 } ], powerCost: 1, tier: 3, cost: 85, cat: "Weapon", tech_category: "Nano", slots: 2, destroyOnPurchasePct: 20, tags: ["experimental"], desc: "Overtuned triple array for only 1 power. Experimental: 20% chance to disintegrate on purchase." },
    { id: "recursive_array_mk1", name: "Recursive Array Mk I", dice: 1, dmgPerHit: 1, faces: [ { roll: 1 }, { roll: 2 }, { roll: 3 }, { roll: 4 }, { roll: 5 }, { dmg: 1 } ], powerCost: 1, tier: 2, cost: 80, cat: "Weapon", tech_category: "Nano", chainOnHit: true, chainDamageDecay: 1, chainMinDamage: 1, desc: "On hit, immediately roll this weapon again. Each successive chained hit deals -1 damage (min 1)." }
  ],

  computers: [
    { id: "positron", name: "Positron Computer", aim: 1, powerCost: 1, tier: 1, cost: 25, cat: "Computer", tech_category: "Grid", desc: "Adds +1 Aim; costs 1 power." },
    { id: "gluon", name: "Gluon Computer", aim: 2, powerCost: 2, tier: 2, cost: 60, cat: "Computer", tech_category: "Grid", desc: "Adds +2 Aim; costs 2 power." },
    { id: "neutrino", name: "Neutrino Computer", aim: 3, powerCost: 3, tier: 3, cost: 100, cat: "Computer", tech_category: "Grid", desc: "Adds +3 Aim; costs 3 power." },
    { id: "sentient_ai", name: "Sentient AI", aim: 4, powerCost: 3, tier: 3, cost: 150, cat: "Computer", tech_category: "Grid", desc: "Adds +4 Aim; costs 3 power."}
  ],

  shields: [
    { id: "gauss", name: "Gauss Shield", shieldTier: 1, powerCost: 1, tier: 1, cost: 20, cat: "Shield", tech_category: "Nano", desc: "Shield tier 1; uses 1 power." },
    { id: "phase", name: "Phase Shield", shieldTier: 2, powerCost: 2, tier: 2, cost: 60, cat: "Shield", tech_category: "Nano", desc: "Shield tier 2; uses 2 power." },
    { id: "omega", name: "Omega Shield", shieldTier: 3, powerCost: 3, tier: 3, cost: 100, cat: "Shield", tech_category: "Nano", desc: "Shield tier 3; uses 3 power." },

    // NEW
    { id: "magnet_shield", name: "Magnet Shield", shieldTier: 2, powerCost: 2, tier: 2, cost: 70, cat: "Shield", tech_category: "Nano", magnet: true, desc: "Shield tier 2. Aggro: enemies must target this ship if possible." },
    { id: "unstable_shield", name: "Unstable Shield", shieldTier: 3, powerCost: 1, tier: 3, cost: 75, cat: "Shield", tech_category: "Nano", destroyOnPurchasePct: 15, tags: ["experimental"], desc: "Overtuned tier-3 shield for 1 power. Experimental: 15% chance to disintegrate when you purchase any shop item." }
  ],

  hull: [
    { id: "improved", name: "Improved Hull", extraHull: 2, powerCost: 0, tier: 2, cost: 22, cat: "Hull", tech_category: "Nano", desc: "Adds 2 hull." },
    { id: "adamantine", name: "Adamantine Hull", extraHull: 3, powerCost: 1, tier: 3, cost: 110, cat: "Hull", tech_category: "Nano", desc: "Adds 3 hull; uses 1 power." },
    { id: "composite", name: "Composite Hull", extraHull: 1, powerCost: 0, tier: 1, cost: 15, cat: "Hull", tech_category: "Nano", desc: "Adds 1 hull." },
    { id: "monolith_plating", name: "Monolith Plating", extraHull: 4, powerCost: 2, tier: 3, cost: 160, cat: "Hull", tech_category: "Nano", desc: "Adds 4 hull; uses 2 power." },

    // NEW
    { id: "magnet_hull", name: "Magnet Hull", extraHull: 2, powerCost: 0, tier: 2, cost: 55, cat: "Hull", tech_category: "Nano", magnet: true, desc: "+2 hull. Aggro: enemies must target this ship if possible." },
    { id: "spite_plating", name: "Spite Plating", extraHull: 1, powerCost: 0, tier: 1, cost: 28, cat: "Hull", tech_category: "Nano", retaliatory: true, dealDamageOnDeathDieThreshold: 5, desc: "+1 hull. On destruction: roll a die; on 5–6, deal 1 damage to the attacker." },
    { id: "reflective_armor", name: "Reflective Armor", extraHull: 1, powerCost: 0, tier: 2, cost: 45, cat: "Hull", tech_category: "Nano", retaliatory: true, dealDamageOnBlockDieThreshold: 6, desc: "+1 hull. When this ship blocks with shields, roll a die; on 6, deal 1 damage back." },
    { id: "reckless_hull", name: "Reckless Hull", extraHull: 3, powerCost: 0, tier: 2, cost: 60, cat: "Hull", tech_category: "Nano", destroyOnRerollPct: 15, tags: ["experimental"], desc: "+3 hull for 0 power. Experimental: 15% chance to vanish on each shop reroll." }
  ],

  rare: RARE_PARTS
} as const;

// =========================
// Derived — all parts flat
// =========================

export const ALL_PARTS: Part[] = [
  ...PARTS.sources,
  ...PARTS.drives,
  ...PARTS.weapons,
  ...PARTS.computers,
  ...PARTS.shields,
  ...PARTS.hull,
  ...RARE_PARTS,
];

// =========================
// UI helpers
// =========================

export const PART_EFFECT_FIELDS = [
  'powerProd', 'powerCost', 'init', 'dice', 'dmgPerHit', 'riftDice', 'shieldTier', 'extraHull', 'aim', 'initLoss', 'regen',
] as const;
export type PartEffectField = typeof PART_EFFECT_FIELDS[number];
export const PART_EFFECT_SYMBOLS: Record<PartEffectField, string> = {
  powerProd: '⚡+', powerCost: '⚡-', init: '🚀', dice: '🎲', dmgPerHit: '💥', riftDice: '🎲', shieldTier: '🛡️', extraHull: '❤️', aim: '🎯', initLoss: '🚀-', regen: '❤️+',
} as const;

export function partEffects(p: Part) {
  const effects: string[] = [];
  for (const key of PART_EFFECT_FIELDS) {
    if (key === 'dmgPerHit') continue;
    const val = p[key as keyof Part];
    if (typeof val === 'number' && val !== 0) effects.push(`${PART_EFFECT_SYMBOLS[key]}${val}`);
  }
  if (p.cat === 'Weapon') {
    const faces = p.faces || [];
    const maxDmg = Math.max(p.dmgPerHit || 0, ...faces.map(f => f.dmg || 0));
    if (maxDmg > 0) effects.push(`${PART_EFFECT_SYMBOLS.dmgPerHit}${maxDmg}`);
    if (faces.length > 0) {
      const hitFaces = faces.filter(f => f.dmg).length;
      if (hitFaces > 0) effects.push(`🎯${Math.round((hitFaces / faces.length) * 100)}%`);
    }
  } else if (typeof p.dmgPerHit === 'number' && p.dmgPerHit !== 0) {
    effects.push(`${PART_EFFECT_SYMBOLS.dmgPerHit}${p.dmgPerHit}`);
  }
  return effects;
}

export function partDescription(p: Part): string {
  if (p.desc) return p.desc;
  switch (p.cat) {
    case 'Source': return `Generates ${p.powerProd || 0} power.`;
    case 'Drive': return `+${p.init || 0} initiative; costs ${p.powerCost || 0} power.`;
    case 'Computer': return `Adds +${p.aim || 0} Aim.`;
    case 'Shield': return `Provides shield tier ${p.shieldTier || 0}.`;
    case 'Hull': return `+${p.extraHull || 0} hull${p.regen ? `; regenerates ${p.regen} each round` : ''}.`;
    case 'Weapon':
    default:
      if (p.riftDice) return `Rolls ${p.riftDice} Rift die${p.riftDice > 1 ? 's' : ''}.`;
      return `Rolls ${p.dice || 0} die for ${p.dmgPerHit || 0} damage each.`;
  }
}

You’re right—enumerating fields is getting unwieldy. Here’s a clean refactor to a data-driven effects system with explicit hooks and a small resolver. It slots into your current files with minimal touch points and supports both combat and economy triggers.

I’m giving you:

1. Core types (Effect, Hook, Part with effects: Effect[])


2. A tiny EffectsEngine (resolve hooks, per-round calls, dynamic stats)


3. Lightweight adapters so your existing parts still work (legacy → effects)


4. Minimal patches for Combat.ts (magnet targeting + on-hit/on-miss hooks) and Shop.ts (onReroll/onPurchase hooks)




---

1) Core Types (drop into shared/effects.ts)

// shared/effects.ts

export type Hook =
  | 'onPreCombat'          // once at battle start (compute dynamic stats; grant buffers)
  | 'onStartRound'         // each round start (corrosion ticks, regen variants)
  | 'onBeforeAttack'       // per attack roll, before dice
  | 'onHit'                // when a weapon hits (including auto faces)
  | 'onMiss'               // when a weapon misses
  | 'onBlock'              // when defending ship blocks (shields)
  | 'onSelfHit'            // rift backlash, etc.
  | 'onShipDeath'          // when the host ship dies
  | 'onEnemyDeath'         // when an enemy dies
  | 'onAllyDeath'          // when an ally dies
  | 'onEndRound'           // tick-down effects
  // Economy / meta:
  | 'onShopReroll'
  | 'onShopPurchase'
  | 'onResearch';

export type Effect =
  // --- Combat utility & statuses ---
  | { kind: 'lowerShieldThisRound'; amount: number }                // Entropy Beam
  | { kind: 'reduceInit'; amount: number }                          // Disruptor
  | { kind: 'grantFleetShields'; tier: number; rounds: number }     // Guardian Shield
  | { kind: 'corrosionApply'; perStackDamage: number }              // Corrosive Beam
  | { kind: 'retaliateOnBlockDamage'; dieThreshold: number; dmg: number } // Reflective Armor
  | { kind: 'retaliateOnDeathDamage'; dieThreshold: number; dmg: number } // Spite Plating
  | { kind: 'aimBuffNextRoundFleet'; amount: number }               // Volatile Cannon payoff
  | { kind: 'designateBonusDamage'; amount: number; rounds: number } // Target Painter

  // --- Dice/variance & dynamic stats ---
  | { kind: 'rerollOnMiss'; chancePct: number }                     // Rebound
  | { kind: 'chainOnHit'; decay: number; minDmg: number }           // Recursive Array
  | { kind: 'gainDicePerShip'; amount: number }                     // Fleetfire
  | { kind: 'gainDicePerUniqueWeapon'; amount: number }             // Hexfire
  | { kind: 'gainDicePerReroll'; amount: number }                   // Reroll Railgun

  // --- Targeting / aggro ---
  | { kind: 'magnetize' }                                           // Magnet Hull/Shield

  // --- Between fights / one-time economy actions ---
  | { kind: 'scrapForNextFightDamage'; dmg: number }                // Consumptive Hull

  // --- Experimental / economy risks & discounts ---
  | { kind: 'econDiscount'; percent: number }                       // Bargain Plasma
  | { kind: 'destroyOnShopReroll'; chancePct: number }              // Discount/ Reckless parts
  | { kind: 'destroyOnPurchase'; chancePct: number }                // Unstable Shield, Volatile Array
  | { kind: 'downgradeOnReroll'; chancePct: number; stat: 'init'|'shieldTier'|'aim'|'powerProd'|'dice'|'dmgPerHit'; min: number }; // Overtuned Drive

// --- Effectful part wrapper (augment your Part) ---
export type EffectfulPart = Part & { effects?: { hook: Hook; effect: Effect }[] };

// --- Shared battle/economy context kept minimal on purpose ---
export type BattleCtx = {
  rng: () => number;
  rerollsThisRun: number;
  // ephemeral per-battle status you track (corrosion stacks, painter, temp shields, etc.)
  status: {
    // keyed by ship id (index) or object identity
    corrosion: Map<number, number>;
    painter: { targetIdx: number|null; rounds: number; bonus: number } | null;
    fleetTempShield: { tier: number; rounds: number } | null;
  };
};

export type EconomyCtx = {
  rng: () => number;
  setDestroyed: (partId: string) => void;     // caller removes it if set
  downgrade: (partId: string, stat: Effect['kind'] extends any ? any : never) => void; // minimal for init now
  applyDiscount: (percent: number) => void;
};

> You’ll import Part from your shared/parts and extend it as EffectfulPart where needed. Existing code can keep using Part—we’ll add adapters.




---

2) Effects Engine (drop into shared/effectsEngine.ts)

// shared/effectsEngine.ts
import type { EffectfulPart, Hook, Effect, BattleCtx, EconomyCtx } from './effects';
import type { Ship } from './types';

export function triggerHook(
  parts: EffectfulPart[],
  hook: Hook,
  host: Ship | null,
  target: Ship | null,
  fleets: { allies: Ship[]; enemies: Ship[] },
  ctx: BattleCtx
) {
  for (const p of parts) {
    const hooks = p.effects?.filter(e => e.hook === hook) ?? [];
    for (const h of hooks) {
      applyEffect(h.effect, p, host, target, fleets, ctx);
    }
  }
}

function applyEffect(
  eff: Effect,
  _part: EffectfulPart,
  host: Ship | null,
  target: Ship | null,
  fleets: { allies: Ship[]; enemies: Ship[] },
  ctx: BattleCtx
) {
  switch (eff.kind) {
    case 'lowerShieldThisRound':
      if (target) target.stats.shieldTier = Math.max(0, (target.stats.shieldTier || 0) - eff.amount);
      break;
    case 'reduceInit':
      if (target) target.stats.init = Math.max(0, (target.stats.init || 0) - eff.amount);
      break;
    case 'grantFleetShields':
      ctx.status.fleetTempShield = { tier: eff.tier, rounds: eff.rounds };
      break;
    case 'corrosionApply':
      if (target?.alive) {
        const idx = target._idx!;
        const curr = ctx.status.corrosion.get(idx) || 0;
        ctx.status.corrosion.set(idx, curr + 1);
      }
      break;
    case 'retaliateOnBlockDamage': {
      if (!host || !target) return;
      const roll = Math.floor(ctx.rng() * 6) + 1;
      if (roll >= eff.dieThreshold) {
        target.hull -= eff.dmg;
        if (target.hull <= 0) { target.hull = 0; target.alive = false; }
      }
      break;
    }
    case 'retaliateOnDeathDamage': {
      if (!host || !target) return;
      const roll = Math.floor(ctx.rng() * 6) + 1;
      if (roll >= eff.dieThreshold) {
        target.hull -= eff.dmg;
        if (target.hull <= 0) { target.hull = 0; target.alive = false; }
      }
      break;
    }
    case 'aimBuffNextRoundFleet':
      // you can store this in ctx.status and apply in onStartRound
      // example: repurpose painter struct or add a new field
      break;
    case 'designateBonusDamage':
      // designate target handled by UI; here we just record into ctx.status
      ctx.status.painter = { targetIdx: target?._idx ?? -1, rounds: eff.rounds, bonus: eff.amount };
      break;

    case 'rerollOnMiss':
      // handled inline during attack roll (hook fired by caller)
      break;
    case 'chainOnHit':
      // handled inline during attack resolution
      break;
    case 'gainDicePerShip':
    case 'gainDicePerUniqueWeapon':
    case 'gainDicePerReroll':
      // handled in onPreCombat to compute dynamic dice
      break;

    case 'magnetize':
      if (host) host.stats.magnet = true as any;
      break;

    case 'scrapForNextFightDamage':
      // handled between fights in campaign layer (not here)
      break;

    // Economy
    case 'econDiscount':
      // handled in Shop layer (see below)
      break;
    case 'destroyOnShopReroll':
    case 'destroyOnPurchase':
    case 'downgradeOnReroll':
      // handled in Shop layer (see below)
      break;

    default:
      // no-op
      break;
  }
}

// --- Dynamic stat pre-compute (call once at battle start) ---
export function precomputeDynamicStats(fleet: Ship[], enemyFleet: Ship[], ctx: BattleCtx) {
  // Fleet size and build diversity for dice scalers
  const otherShips = (s: Ship) => fleet.filter(x => x.alive && x !== s);
  for (const s of fleet) {
    for (const w of s.weapons) {
      const ep = w as EffectfulPart;
      const hooks = ep.effects ?? [];
      const hasPerShip = hooks.find(h => h.effect.kind === 'gainDicePerShip') as any;
      const hasPerType = hooks.find(h => h.effect.kind === 'gainDicePerUniqueWeapon') as any;
      const hasPerReroll = hooks.find(h => h.effect.kind === 'gainDicePerReroll') as any;

      // base dice already in w.dice
      let bonus = 0;
      if (hasPerShip) {
        const n = otherShips(s).length;
        bonus += (hasPerShip.effect as any).amount * n;
      }
      if (hasPerType) {
        const unique = new Set(s.weapons.map(p => p.id.split('_')[0] ?? p.name)).size;
        bonus += (hasPerType.effect as any).amount * Math.max(0, unique - 1);
      }
      if (hasPerReroll) {
        bonus += (hasPerReroll.effect as any).amount * ctx.rerollsThisRun;
      }
      (w as any)._dynDice = Math.max(0, (w.dice || 0) + bonus);
    }
  }
}

// --- Round start ticks (corrosion, painter timers, fleet temp shields) ---
export function startRoundTick(allies: Ship[], enemies: Ship[], ctx: BattleCtx) {
  // painter decay
  if (ctx.status.painter && ctx.status.painter.rounds > 0) {
    ctx.status.painter.rounds--;
    if (ctx.status.painter.rounds <= 0) ctx.status.painter = null;
  }
  // corrosion damage
  const tick = (fleet: Ship[]) => {
    for (const s of fleet) {
      if (!s.alive) continue;
      const idx = s._idx!;
      const stacks = ctx.status.corrosion.get(idx) || 0;
      if (stacks > 0) {
        s.hull -= stacks;
        if (s.hull <= 0) { s.hull = 0; s.alive = false; }
      }
    }
  };
  tick(allies); tick(enemies);
  // fleet temp shields decay is represented by a flag on ship.stats if you choose
}


---

3) Adapters + Example Parts (augment shared/parts.ts)

Add effects arrays to the parts that need them. Keep legacy fields for UI (aim, dice, etc.). Examples:

// Example rare beam with shield lower
export const ENTROPY_BEAM: EffectfulPart = {
  id: "entropy_beam",
  name: "Entropy Beam",
  dice: 1, dmgPerHit: 0,
  faces: [{ roll: 6 }],
  powerCost: 1, tier: 2, cost: 60,
  cat: "Weapon", tech_category: "Nano",
  desc: "Always hits; lowers enemy shield tier by 1 this round.",
  effects: [{ hook: 'onHit', effect: { kind: 'lowerShieldThisRound', amount: 1 } }]
};

// Rebound Blaster
export const REBOUND_BLASTER: EffectfulPart = {
  id: "rebound_blaster",
  name: "Rebound Blaster",
  dice: 1, dmgPerHit: 1,
  faces: [{ roll: 1 }, { roll: 2 }, { roll: 3 }, { roll: 4 }, { roll: 5 }, { dmg: 1 }],
  powerCost: 1, tier: 1, cost: 35,
  cat: "Weapon", tech_category: "Nano",
  desc: "On miss: 25% chance to reroll.",
  effects: [{ hook: 'onMiss', effect: { kind: 'rerollOnMiss', chancePct: 25 } }]
};

// Reroll Railgun
export const REROLL_RAILGUN: EffectfulPart = {
  id: "reroll_railgun",
  name: "Reroll Railgun",
  dice: 1, dmgPerHit: 1,
  faces: [{ roll: 1 }, { roll: 2 }, { roll: 3 }, { roll: 4 }, { roll: 5 }, { dmg: 1 }],
  powerCost: 2, tier: 2, cost: 100,
  cat: "Weapon", tech_category: "Nano", rare: true,
  desc: "Gains +1 die per shop reroll this run.",
  effects: [{ hook: 'onPreCombat', effect: { kind: 'gainDicePerReroll', amount: 1 } }]
};

// Hexfire & Fleetfire
export const HEXFIRE: EffectfulPart = {
  id: "hexfire_projector",
  name: "Hexfire Projector",
  dice: 1, dmgPerHit: 1,
  faces: [{ roll: 1 }, { roll: 2 }, { roll: 3 }, { roll: 4 }, { roll: 5 }, { dmg: 1 }],
  powerCost: 2, tier: 2, cost: 75,
  cat: "Weapon", tech_category: "Nano",
  desc: "Gains +1 die per unique weapon type on this ship.",
  effects: [{ hook: 'onPreCombat', effect: { kind: 'gainDicePerUniqueWeapon', amount: 1 } }]
};

export const FLEETFIRE: EffectfulPart = {
  id: "fleetfire_array",
  name: "Fleetfire Array",
  dice: 1, dmgPerHit: 1,
  faces: [{ roll: 1 }, { roll: 2 }, { roll: 3 }, { roll: 4 }, { roll: 5 }, { dmg: 1 }],
  powerCost: 2, tier: 2, cost: 70,
  cat: "Weapon", tech_category: "Nano",
  desc: "Gains +1 die per other ship in your fleet.",
  effects: [{ hook: 'onPreCombat', effect: { kind: 'gainDicePerShip', amount: 1 } }]
};

// Magnet hull/shield
export const MAGNET_HULL: EffectfulPart = {
  id: "magnet_hull",
  name: "Magnet Hull",
  extraHull: 2, tier: 2, cost: 55,
  cat: "Hull", tech_category: "Nano",
  desc: "+2 hull. Aggro: enemies must target this ship if possible.",
  effects: [{ hook: 'onPreCombat', effect: { kind: 'magnetize' } }]
};

export const MAGNET_SHIELD: EffectfulPart = {
  id: "magnet_shield",
  name: "Magnet Shield",
  shieldTier: 2, powerCost: 2, tier: 2, cost: 70,
  cat: "Shield", tech_category: "Nano",
  desc: "Tier 2 shield. Aggro magnet.",
  effects: [{ hook: 'onPreCombat', effect: { kind: 'magnetize' } }]
};

// Guardian Shield (on death)
export const GUARDIAN_SHIELD: EffectfulPart = {
  id: "guardian_shield",
  name: "Guardian Shield",
  shieldTier: 1, powerCost: 1, tier: 2, cost: 85,
  cat: "Shield", tech_category: "Nano", rare: true,
  desc: "On death, allies gain tier 1 shields for 2 rounds.",
  effects: [{ hook: 'onShipDeath', effect: { kind: 'grantFleetShields', tier: 1, rounds: 2 } }]
};

// Corrosive Beam
export const CORROSIVE_BEAM: EffectfulPart = {
  id: "corrosive_beam",
  name: "Corrosive Beam",
  dice: 1, dmgPerHit: 0,
  faces: [{ roll: 6 }],
  powerCost: 2, tier: 2, cost: 100,
  cat: "Weapon", tech_category: "Nano", rare: true,
  desc: "On hit, apply a corrosion stack (1 dmg/turn).",
  effects: [{ hook: 'onHit', effect: { kind: 'corrosionApply', perStackDamage: 1 } }]
};

// Econ examples
export const BARGAIN_PLASMA: EffectfulPart = {
  id: "bargain_plasma",
  name: "Bargain Plasma",
  dice: 1, dmgPerHit: 1,
  faces: [{ roll: 1 }, { roll: 2 }, { roll: 3 }, { roll: 4 }, { roll: 5 }, { dmg: 1 }],
  powerCost: 1, tier: 1, cost: 20,
  cat: "Weapon", tech_category: "Nano",
  desc: "While installed, shop prices are 10% lower.",
  effects: [{ hook: 'onShopPurchase', effect: { kind: 'econDiscount', percent: 10 } }]
};

export const DISCOUNT_SOURCE: EffectfulPart = {
  id: "discount_source",
  name: "Discount Source",
  powerProd: 4, tier: 2, cost: 35,
  cat: "Source", tech_category: "Grid",
  desc: "15% chance to vanish on reroll.",
  effects: [{ hook: 'onShopReroll', effect: { kind: 'destroyOnShopReroll', chancePct: 15 } }]
};

export const UNSTABLE_SHIELD: EffectfulPart = {
  id: "unstable_shield",
  name: "Unstable Shield",
  shieldTier: 3, powerCost: 1, tier: 3, cost: 75,
  cat: "Shield", tech_category: "Nano",
  desc: "15% chance to disintegrate when you purchase any item.",
  effects: [{ hook: 'onShopPurchase', effect: { kind: 'destroyOnPurchase', chancePct: 15 } }]
};

export const OVERTUNED_DRIVE: EffectfulPart = {
  id: "overtuned_drive",
  name: "Overtuned Drive",
  init: 2, powerCost: 1, tier: 2, cost: 40,
  cat: "Drive", tech_category: "Grid",
  desc: "20% chance to lose 1 INIT on reroll.",
  effects: [{ hook: 'onShopReroll', effect: { kind: 'downgradeOnReroll', chancePct: 20, stat: 'init', min: 0 } }]
};

> You can keep your existing arrays; just type them as EffectfulPart[]. Parts without effects behave exactly as before.




---

4) Minimal Combat Integration (patches to Combat.ts)

A. Call precomputeDynamicStats once at battle start and tick start-of-round statuses:

// at top
import { precomputeDynamicStats, startRoundTick, triggerHook } from '../../shared/effectsEngine';
import type { EffectfulPart, BattleCtx } from '../../shared/effects';

// when you assemble fleets (give each Ship an index for map keys)
pFleet.forEach((s, i) => (s as any)._idx = i);
eFleet.forEach((s, i) => (s as any)._idx = i);

// build a ctx (store rerollsThisRun in your run state)
const battleCtx: BattleCtx = {
  rng: () => (rng ?? fromMathRandom()).next(),
  rerollsThisRun: runState.rerollsThisRun || 0,
  status: { corrosion: new Map(), painter: null, fleetTempShield: null },
};

// before first initiative:
precomputeDynamicStats(pFleet, eFleet, battleCtx);

// at start of each round:
startRoundTick(pFleet, eFleet, battleCtx);

B. Respect magnet in targeting (cheap override):

export function targetIndex(defFleet:Ship[], strategy:'kill'|'guns'){
  // prioritize alive + magnetized first
  const magnetIdx = defFleet.findIndex(s => s.alive && (s.stats as any).magnet);
  if (magnetIdx !== -1) return magnetIdx;

  if(strategy==='kill'){
    let best=-1, bestHull=1e9;
    for(let i=0;i<defFleet.length;i++){ const s=defFleet[i]; if(s && s.alive){ if(s.hull < bestHull){ bestHull=s.hull; best=i } } }
    if(best!==-1) return best
  }
  if(strategy==='guns'){
    let best=-1, guns=-1;
    for(let i=0;i<defFleet.length;i++){ const s=defFleet[i]; if(s && s.alive){ const g=s.weapons.length; if(g>guns){ guns=g; best=i } } }
    if(best!==-1) return best
  }
  return defFleet.findIndex(s=>s.alive)
}

C. Fire hooks in volley() for onHit/onMiss, and allow rerollOnMiss/chainOnHit inline:

import type { EffectfulPart } from '../../shared/effects';

export function volley(attacker:Ship, defender:Ship, side:'P'|'E', logArr:string[], friends:Ship[], rng?: Rng){
  const r: Rng = rng ?? fromMathRandom();
  const thr = successThreshold(attacker.stats.aim, defender.stats.shieldTier);
  const fleets = { allies: friends, enemies: side==='P' ? (friends as any)._enemies : (friends as any)._allies }; // or pass explicitly

  // normal weapons
  attacker.weapons.forEach((wRaw) => {
    const w = wRaw as EffectfulPart;
    if(w.riftDice) return;

    const rollWeapon = (damage:number, faceRoll:number|undefined, isAuto:boolean) => {
      defender.hull -= damage;
      const msg = isAuto ? `auto ${damage}` : (damage>0 ? `roll ${faceRoll} ≥ ${thr} → ${damage}` : `roll ${faceRoll} ≥ ${thr}`);
      logArr.push(`${side==='P'?'🟦':'🟥'} ${attacker.frame.name} → ${defender.frame.name} | ${w.name}: ${msg}`);
      if(defender.hull<=0){ defender.alive=false; defender.hull=0; logArr.push(`💥 ${defender.frame.name} destroyed!`) }
      if (w.initLoss){ defender.stats.init = Math.max(0, defender.stats.init - w.initLoss); logArr.push(`⌛ ${defender.frame.name} -${w.initLoss} INIT`); }
      // onHit hooks (beam/status)
      triggerHook([w], 'onHit', attacker, defender, { allies: friends, enemies: (side==='P'? (friends as any)._enemies : (friends as any)._allies) }, (globalThis as any).battleCtx);
    };

    const diceToRoll = (w as any)._dynDice ?? w.dice ?? 0;
    for(let i=0;i<diceToRoll;i++){
      const faces = w.faces||[];
      const face = faces[Math.floor(r.next()*faces.length)] || {};
      if(typeof face.dmg === 'number'){
        rollWeapon(face.dmg, undefined, true);
      } else if(typeof face.roll === 'number' && face.roll >= thr){
        rollWeapon(w.dmgPerHit||0, face.roll, false);
      } else {
        const rolled = typeof face.roll === 'number' ? face.roll : 'miss';
        logArr.push(`${side==='P'?'🟦':'🟥'} ${attacker.frame.name} misses with ${w.name} (roll ${rolled} < ${thr})`);
        // onMiss hooks (e.g., Rebound)
        triggerHook([w], 'onMiss', attacker, defender, { allies: friends, enemies: (side==='P'? (friends as any)._enemies : (friends as any)._allies) }, (globalThis as any).battleCtx);
        // inline support for rerollOnMiss
        const missHooks = (w.effects ?? []).filter(e => e.hook === 'onMiss' && e.effect.kind === 'rerollOnMiss');
        for (const mh of missHooks as any[]) {
          if (r.next()*100 < mh.effect.chancePct) {
            // attempt a single immediate reroll using same face threshold logic
            const rerFace = faces[Math.floor(r.next()*faces.length)] || {};
            if (typeof rerFace.dmg === 'number') rollWeapon(rerFace.dmg, undefined, true);
            else if (typeof rerFace.roll === 'number' && rerFace.roll >= thr) rollWeapon(w.dmgPerHit||0, rerFace.roll, false);
          }
        }
      }
      if(face.self){
        assignRiftSelfDamage(friends, side, logArr);
        triggerHook([w], 'onSelfHit', attacker, defender, { allies: friends, enemies: (side==='P'? (friends as any)._enemies : (friends as any)._allies) }, (globalTh