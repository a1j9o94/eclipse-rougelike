/* eslint-disable react-refresh/only-export-components */
import React from 'react'
import { render } from '@testing-library/react'
import OutpostPage from '../../pages/OutpostPage'
import useOutpostState from '../../controllers/useOutpostState'
import useOutpostController from '../../controllers/useOutpostController'

import type { Resources, Research } from '../../../shared/defaults'
import type { Part } from '../../../shared/parts'
import type { Ship } from '../../../shared/types'

export type RenderOutpostOptions = {
  gameMode?: 'single'|'multiplayer'
  initial?: {
    resources?: Resources
    research?: Research
    blueprints?: Record<string, Part[]>
    fleet?: Ship[]
    capacityCap?: number
    sector?: number
    rerollCost?: number
    baseRerollCost?: number
  }
}

function OutpostHarness({ gameMode = 'single', initial }: RenderOutpostOptions){
  // Start from a fresh single-player outpost state; no saved run
  const state = useOutpostState(null)
  // Apply any provided initial overrides synchronously on first render
  React.useEffect(() => {
    if (!initial) return
    if (initial.resources) state.setResources(initial.resources)
    if (initial.research) state.setResearch(initial.research)
    if (initial.blueprints) state.setBlueprints(initial.blueprints as never)
    if (initial.fleet) state.setFleet(initial.fleet as never)
    if (typeof initial.capacityCap === 'number') state.setCapacity({ cap: initial.capacityCap })
    if (typeof initial.rerollCost === 'number') state.setRerollCost(initial.rerollCost)
    if (typeof initial.baseRerollCost === 'number') state.setBaseRerollCost(initial.baseRerollCost)
    // sector is captured below when building controller props
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const { outpost } = useOutpostController({
    gameMode,
    multi: undefined as unknown as never,
    state: {
      resources: state.resources,
      research: state.research,
      blueprints: state.blueprints,
      fleet: state.fleet as never,
      capacity: state.capacity,
      tonnage: state.tonnage,
      shop: state.shop,
      focused: state.focused,
      rerollCost: state.rerollCost,
      shopVersion: state.shopVersion,
      sector: initial?.sector ?? 1,
      endless: false,
    },
    setters: {
      setResources: state.setResources,
      setResearch: state.setResearch,
      setBlueprints: state.setBlueprints,
      setFleet: state.setFleet as never,
      setCapacity: state.setCapacity,
      setFocused: state.setFocused,
      setRerollCost: state.setRerollCost,
      setShopVersion: state.setShopVersion,
      setShop: state.setShop,
      setLastEffects: () => {},
      setBaseRerollCost: state.setBaseRerollCost,
      setMpSeeded: () => {},
      setMpSeedSubmitted: () => {},
      setMpServerSnapshotApplied: () => {},
      setMpLastServerApplyRound: () => {},
      setMpRerollInitRound: () => {},
    },
    sfx: { playEffect: () => {} },
    resetRun: () => {},
  })
  return <OutpostPage {...outpost} />
}

export function renderOutpost(opts: RenderOutpostOptions = {}){
  return render(<OutpostHarness {...opts} />)
}

export default renderOutpost
