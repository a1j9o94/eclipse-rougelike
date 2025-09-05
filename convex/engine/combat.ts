// Deterministic, server-authoritative combat engine for multiplayer rounds
// Keep this module self-contained (no imports from src/ client code)

export type DieFace = { roll?: number; dmg?: number; self?: number };
export type WeaponPart = { name: string; dice?: number; dmgPerHit?: number; faces?: DieFace[]; initLoss?: number };
export type FrameLike = { id: string; name: string };
export type ShipSnap = {
  frame: FrameLike;
  weapons: WeaponPart[];
  riftDice: number;
  stats: { init: number; hullCap: number; valid: boolean; aim: number; shieldTier: number; regen: number };
  hull: number;
  alive: boolean;
};

export type SimulateArgs = {
  seed: string;
  playerAId: string;
  playerBId: string;
  fleetA: ShipSnap[];
  fleetB: ShipSnap[];
};

export type SimulateResult = { winnerPlayerId: string; roundLog: string[] };

// Small seeded RNG (mulberry32)
function hash32(s: string) { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rngFrom(seed: string) { let a = hash32(seed) || 0x9e3779b9; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// Minimal helpers ported from client without imports
function sizeRank(frame: { id: string }) { return frame.id === 'dread' ? 3 : frame.id === 'cruiser' ? 2 : 1; }
function successThreshold(aim: number, shieldTier: number) { return Math.min(6, Math.max(2, 6 - (aim - shieldTier))); }
const RIFT_FACES: DieFace[] = [ { dmg: 1 }, { dmg: 2 }, { dmg: 3, self: 1 }, { self: 1 }, {}, {} ];

type Side = 'A' | 'B';
type InitEntry = { side: Side; idx: number; init: number; size: number };

function cloneFleet(fleet: ShipSnap[]): ShipSnap[] { return fleet.map(s => ({
  frame: { ...s.frame },
  weapons: (s.weapons || []).map(w => ({ ...w, faces: w.faces ? w.faces.map(f => ({ ...f })) : undefined })),
  riftDice: s.riftDice || 0,
  stats: { ...s.stats },
  hull: typeof s.hull === 'number' ? s.hull : (s.stats?.hullCap || 0),
  alive: s.alive !== false,
})); }

function buildInitiative(rng: () => number, A: ShipSnap[], B: ShipSnap[]): InitEntry[] {
  const q: InitEntry[] = [];
  const regen = (s: ShipSnap) => { if (s.alive && s.stats.regen > 0 && s.hull > 0) { s.hull = Math.min(s.stats.hullCap, s.hull + s.stats.regen); } };
  A.forEach((s, i) => { regen(s); if (s.alive && s.stats.valid) q.push({ side: 'A', idx: i, init: s.stats.init, size: sizeRank(s.frame) }); });
  B.forEach((s, i) => { regen(s); if (s.alive && s.stats.valid) q.push({ side: 'B', idx: i, init: s.stats.init, size: sizeRank(s.frame) }); });
  q.sort((a, b) => (b.init - a.init) || (b.size - a.size) || (rng() - 0.5));
  return q;
}

function targetIndex(defFleet: ShipSnap[], strategy: 'kill' | 'guns') {
  if (strategy === 'kill') {
    let best = -1, bestHull = 1e9;
    for (let i = 0; i < defFleet.length; i++) { const s = defFleet[i]; if (s && s.alive && s.stats.valid) { if (s.hull < bestHull) { bestHull = s.hull; best = i; } } }
    if (best !== -1) return best;
  }
  if (strategy === 'guns') {
    let best = -1, guns = -1;
    for (let i = 0; i < defFleet.length; i++) { const s = defFleet[i]; if (s && s.alive && s.stats.valid) { const g = s.weapons.length; if (g > guns) { guns = g; best = i; } } }
    if (best !== -1) return best;
  }
  return defFleet.findIndex(s => s.alive && s.stats.valid);
}

function assignRiftSelfDamage(friends: ShipSnap[], side: Side, logArr: string[]) {
  const riftShips = friends.filter(s => s.alive && s.riftDice > 0);
  if (riftShips.length === 0) return;
  const sorted = [...riftShips].sort((a, b) => (sizeRank(b.frame) - sizeRank(a.frame)) || (b.hull - a.hull));
  const target = sorted.find(s => s.hull <= 1) || sorted[0];
  target.hull -= 1;
  logArr.push(`${side === 'A' ? '🟦' : '🟥'} ${target.frame.name} suffers 1 Rift backlash`);
  if (target.hull <= 0) { target.alive = false; target.hull = 0; logArr.push(`💥 ${target.frame.name} destroyed by Rift backlash!`); }
}

function volley(rng: () => number, attacker: ShipSnap, defender: ShipSnap, side: Side, logArr: string[], friends: ShipSnap[]) {
  const thr = successThreshold(attacker.stats.aim, defender.stats.shieldTier);
  (attacker.weapons || []).forEach((w) => {
    const dice = Math.max(0, w.dice || 0);
    const faces = w.faces || [];
    for (let i = 0; i < dice; i++) {
      const face = faces.length ? (faces[Math.floor(rng() * faces.length)] || {}) : {};
      if (typeof face.dmg === 'number' && face.dmg > 0) {
        const dmg = face.dmg;
        defender.hull -= dmg;
        logArr.push(`${side === 'A' ? '🟦' : '🟥'} ${attacker.frame.name} → ${defender.frame.name} | ${w.name}: auto ${dmg}`);
        if (defender.hull <= 0) { defender.alive = false; defender.hull = 0; logArr.push(`💥 ${defender.frame.name} destroyed!`); }
        if (w.initLoss) { defender.stats.init = Math.max(0, defender.stats.init - w.initLoss); logArr.push(`⌛ ${defender.frame.name} -${w.initLoss} INIT`); }
      } else {
        const roll = 1 + Math.floor(rng() * 6);
        if (roll >= thr) {
          const dmg = w.dmgPerHit || 0;
          defender.hull -= dmg;
          logArr.push(`${side === 'A' ? '🟦' : '🟥'} ${attacker.frame.name} → ${defender.frame.name} | ${w.name}: roll ${roll} ≥ ${thr} → ${dmg}`);
          if (defender.hull <= 0) { defender.alive = false; defender.hull = 0; logArr.push(`💥 ${defender.frame.name} destroyed!`); }
          if (w.initLoss) { defender.stats.init = Math.max(0, defender.stats.init - w.initLoss); logArr.push(`⌛ ${defender.frame.name} -${w.initLoss} INIT`); }
        } else {
          logArr.push(`${side === 'A' ? '🟦' : '🟥'} ${attacker.frame.name} misses with ${w.name} (roll ${roll} < ${thr})`);
        }
      }
      if (face.self) { assignRiftSelfDamage(friends, side, logArr); }
      if (!defender.alive) break;
    }
  });
  if ((attacker.riftDice || 0) > 0) {
    for (let i = 0; i < attacker.riftDice; i++) {
      const face = RIFT_FACES[Math.floor(rng() * RIFT_FACES.length)];
      if (typeof face.dmg === 'number' && face.dmg > 0) {
        defender.hull -= face.dmg;
        logArr.push(`${side === 'A' ? '🟦' : '🟥'} ${attacker.frame.name} Rift die hits for ${face.dmg}`);
        if (defender.hull <= 0) { defender.alive = false; defender.hull = 0; logArr.push(`💥 ${defender.frame.name} destroyed!`); }
      } else {
        logArr.push(`${side === 'A' ? '🟦' : '🟥'} ${attacker.frame.name} Rift die misses`);
      }
      if (face.self) { assignRiftSelfDamage(friends, side, logArr); }
      if (!defender.alive) break;
    }
  }
}

export function simulateCombat(args: SimulateArgs): SimulateResult {
  const { seed, playerAId, playerBId } = args;
  const rng = rngFrom(seed);
  const A = cloneFleet(args.fleetA || []);
  const B = cloneFleet(args.fleetB || []);
  const log: string[] = [];
  const header = `— Round 1 —`;
  log.push(header);

  // Simulate up to a safety cap of rounds to prevent infinite loops
  let round = 1;
  while (round <= 50) {
    const q = buildInitiative(rng, A, B);
    if (q.length === 0) break;
    for (const e of q) {
      const isA = e.side === 'A';
      const atkFleet = isA ? A : B;
      const defFleet = isA ? B : A;
      const friends = atkFleet;
      const atk = atkFleet[e.idx];
      if (!atk || !atk.alive || !atk.stats.valid) continue;
      const strategy: 'kill' | 'guns' = isA ? 'guns' : 'kill';
      const defIdx = targetIndex(defFleet, strategy);
      if (defIdx === -1) continue;
      const def = defFleet[defIdx];
      volley(rng, atk, def, isA ? 'A' : 'B', log, friends);
      if (!def.alive) {
        // if entire defending team is dead, stop early
        const stillAlive = defFleet.some(s => s.alive && s.stats.valid);
        if (!stillAlive) break;
      }
    }
    const aAlive = A.some(s => s.alive && s.stats.valid);
    const bAlive = B.some(s => s.alive && s.stats.valid);
    if (!aAlive || !bAlive) break;
    round += 1;
    log.push(`— Round ${round} —`);
  }

  const aAlive = A.some(s => s.alive && s.stats.valid);
  const bAlive = B.some(s => s.alive && s.stats.valid);
  const winnerPlayerId = aAlive && !bAlive ? playerAId : (!aAlive && bAlive ? playerBId : (rng() < 0.5 ? playerAId : playerBId));
  log.push(`Winner: ${winnerPlayerId === playerAId ? 'Player A' : 'Player B'}`);

  return { winnerPlayerId, roundLog: log };
}

export default { simulateCombat };
