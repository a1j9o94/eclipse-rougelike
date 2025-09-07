import type { Part } from '../../shared/parts'
import type { FrameId } from '../../shared/frames'
import type { Ship, GhostDelta } from '../../shared/types'
import { getFrame, makeShip } from '../game/ship'
import { canInstallOnClass as canInstallClassOp } from '../controllers/outpostController'

export function canInstallOnClass(blueprints: Record<FrameId, Part[]>, frameId: FrameId, part: Part){
  return canInstallClassOp(blueprints, frameId, part)
}

export function ghostClassDelta(blueprints: Record<FrameId, Part[]>, ship: Ship, part: Part): GhostDelta {
  const frameId = ship.frame.id as FrameId
  const chk = canInstallOnClass(blueprints, frameId, part)
  const base = makeShip(ship.frame, blueprints[frameId])
  const powerOk = !!chk.tmp.drive && chk.tmp.sources.length>0 && chk.tmp.stats.powerUse <= chk.tmp.stats.powerProd
  const slotsUsed = chk.slotsUsed || ([...blueprints[frameId], part].reduce((a,p)=>a+(p.slots||1),0))
  const slotCap = chk.slotCap || getFrame(frameId).tiles
  const slotOk = slotsUsed <= slotCap
  return {
    targetName: ship.frame.name + ' (class)',
    use: chk.tmp.stats.powerUse,
    prod: chk.tmp.stats.powerProd,
    valid: powerOk,
    slotsUsed,
    slotCap,
    slotOk,
    initBefore: base.stats.init,
    initAfter: chk.tmp.stats.init,
    initDelta: chk.tmp.stats.init - base.stats.init,
    hullBefore: base.stats.hullCap,
    hullAfter: chk.tmp.stats.hullCap,
    hullDelta: chk.tmp.stats.hullCap - base.stats.hullCap,
  }
}
