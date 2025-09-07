import { PARTS, getFrame } from '../game'
import type { Ship } from '../../shared/types'
import type { Part, DieFace } from '../../shared/parts'

export type ShipSnapshot = {
  frame?: { id?: string }
  partIds?: string[]
  parts?: unknown[]
  weapons?: { name?: string; dice?: number; dmgPerHit?: number; faces?: DieFace[]; initLoss?: number }[]
  riftDice?: number
  stats?: { init?: number; hullCap?: number; powerUse?: number; powerProd?: number; aim?: number; shieldTier?: number; regen?: number }
  hull?: number
  alive?: boolean
}

export function fromSnapshotToShip(snap: ShipSnapshot): Ship {
  const id = (snap?.frame?.id as string | undefined) || 'interceptor'
  const frameId = (id === 'interceptor' || id === 'cruiser' || id === 'dread') ? id : 'interceptor'
  const frame = getFrame(frameId)
  const base: Ship = {
    frame,
    parts: [],
    weapons: [],
    riftDice: snap?.riftDice || 0,
    stats: { init: snap?.stats?.init || 0, hullCap: snap?.stats?.hullCap || 1, powerUse: 0, powerProd: 0, valid: true, aim: snap?.stats?.aim || 0, shieldTier: snap?.stats?.shieldTier || 0, regen: snap?.stats?.regen || 0 },
    hull: Math.max(0, snap?.hull ?? (snap?.stats?.hullCap || 1)),
    alive: snap?.alive !== false,
  } as Ship

  const fullParts = Array.isArray(snap?.parts) ? (snap.parts as unknown[]) : []
  const idList = Array.isArray(snap?.partIds) ? (snap.partIds as string[]) : []
  const parts: Part[] = fullParts.length > 0
    ? (fullParts as Part[])
    : (idList.length > 0 ? idList.map(id => (PARTS.sources.find(p=>p.id===id) || PARTS.drives.find(p=>p.id===id) || PARTS.weapons.find(p=>p.id===id) || PARTS.computers.find(p=>p.id===id) || PARTS.shields.find(p=>p.id===id) || PARTS.hull.find(p=>p.id===id) || null)).filter((p): p is Part => Boolean(p)) : [])
  const st = base.stats
  if (st.init > 0) parts.push({ id: `mp_drive_${st.init}`, name: 'Drive', init: st.init, powerCost: 0, tier: 1, cost: 0, cat: 'Drive', tech_category: 'Grid' })
  if (st.aim > 0) parts.push({ id: `mp_comp_${st.aim}`, name: 'Computer', aim: st.aim, powerCost: 0, tier: 1, cost: 0, cat: 'Computer', tech_category: 'Grid' })
  if (st.shieldTier > 0) parts.push({ id: `mp_shield_${st.shieldTier}`, name: 'Shield', shieldTier: st.shieldTier, powerCost: 0, tier: 1, cost: 0, cat: 'Shield', tech_category: 'Nano' })
  const extraHull = Math.max(0, (st.hullCap || 0) - (frame.baseHull || 0))
  if (extraHull > 0 || st.regen > 0) parts.push({ id: `mp_hull_${extraHull}_${st.regen||0}`, name: 'Hull', extraHull, regen: st.regen || 0, powerCost: 0, tier: 1, cost: 0, cat: 'Hull', tech_category: 'Nano' })
  const ws = Array.isArray(snap?.weapons) ? snap.weapons : []
  for (let i = 0; i < ws.length; i++) {
    const w = ws[i]
    parts.push({ id: `mp_w_${i}`, name: w.name || 'Weapon', dice: w.dice || 0, dmgPerHit: w.dmgPerHit || 0, faces: (w.faces as DieFace[] | undefined) || [], initLoss: w.initLoss || 0, powerCost: 0, tier: 1, cost: 0, cat: 'Weapon', tech_category: 'Nano' })
  }
  if (fullParts.length === 0 && idList.length === 0 && base.riftDice > 0) parts.push({ id: `mp_rift_${base.riftDice}`, name: 'Rift', riftDice: base.riftDice, faces: [] as DieFace[], powerCost: 0, tier: 1, cost: 0, cat: 'Weapon', tech_category: 'Nano' })
  const hasSource = parts.some((p) => 'powerProd' in p && typeof (p as { powerProd?: number }).powerProd === 'number')
  if (!hasSource) parts.unshift({ id: 'mp_source', name: 'Source', powerProd: 0, tier: 1, cost: 0, cat: 'Source', tech_category: 'Grid' } as unknown as Part)
  base.parts = parts
  base.weapons = parts.filter(p => p.cat === 'Weapon')
  return base
}
