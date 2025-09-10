import { useMemo } from 'react'
import type { Part } from '../../shared/parts'
import type { FrameId } from '../game'
import type { OutpostHandlers } from './useOutpostHandlers'

export function useOutpostActionMap(handlers: OutpostHandlers){
  return useMemo(() => ({
    applyOutpost: handlers.apply,
    buyAndInstall: (part: Part) => handlers.buyAndInstall(part),
    sellPart: (frameId: FrameId, idx: number) => handlers.sellPart(frameId, idx),
    buildShip: () => handlers.buildShip(),
    upgradeShip: (idx: number) => handlers.upgradeShip(idx),
    upgradeDock: () => handlers.upgradeDock(),
    researchTrack: (t: 'Military'|'Grid'|'Nano') => handlers.research(t),
    doReroll: () => handlers.reroll(),
    spStartCombat: () => handlers.startCombat(),
  }), [handlers])
}

export default useOutpostActionMap

