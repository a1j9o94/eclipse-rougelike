import { useMemo, useState } from 'react'
import { getFrame, makeShip, rollInventory } from '../game'
import { INITIAL_BLUEPRINTS, INITIAL_RESEARCH, INITIAL_RESOURCES, INITIAL_CAPACITY, type Resources, type Research } from '../../shared/defaults'
import type { CapacityState, Ship } from '../../shared/types'
import type { FrameId } from '../game'
import type { Part } from '../../shared/parts'
import type { SavedRun } from '../game/storage'
import { selectTonnage } from '../selectors'

export function useOutpostState(saved: SavedRun | null){
  const initialBlueprints: Record<FrameId, Part[]> = saved?.blueprints ?? {
    interceptor: [ ...INITIAL_BLUEPRINTS.interceptor ],
    cruiser: [ ...INITIAL_BLUEPRINTS.cruiser ],
    dread: [ ...INITIAL_BLUEPRINTS.dread ],
  }
  const [blueprints, setBlueprints] = useState<Record<FrameId, Part[]>>(initialBlueprints)

  const [resources, setResources] = useState<Resources>(saved?.resources ?? { ...INITIAL_RESOURCES })
  const [research, setResearch] = useState<Research>(saved?.research ?? { ...INITIAL_RESEARCH })

  const [rerollCost, setRerollCost] = useState(() => saved?.rerollCost ?? 8)
  const [baseRerollCost, setBaseRerollCost] = useState(() => saved?.baseRerollCost ?? 8)

  const [capacity, setCapacity] = useState<CapacityState>(saved?.capacity ?? { cap: INITIAL_CAPACITY.cap })

  const [fleet, setFleet] = useState<Ship[]>(() => (saved?.fleet ?? [ makeShip(getFrame('interceptor'), [ ...INITIAL_BLUEPRINTS.interceptor ]) ]) as unknown as Ship[])
  const tonnage = useMemo(() => selectTonnage(fleet as unknown as Ship[], capacity), [fleet, capacity])

  const [focused, setFocused] = useState(0)
  const [shop, setShop] = useState(()=> saved?.shop ?? { items: rollInventory(saved?.research ?? INITIAL_RESEARCH) })
  const [shopVersion, setShopVersion] = useState(0)

  return {
    blueprints, setBlueprints,
    resources, setResources,
    research, setResearch,
    rerollCost, setRerollCost,
    baseRerollCost, setBaseRerollCost,
    capacity, setCapacity,
    fleet, setFleet,
    tonnage,
    focused, setFocused,
    shop, setShop,
    shopVersion, setShopVersion,
  }
}

export type OutpostStateBundle = ReturnType<typeof useOutpostState>

export default useOutpostState

