import type { Research, Resources } from '../../shared/defaults'
import { researchLabel as researchLabelCore, canResearch as canResearchCore, researchLabelWithMods, canResearchWithMods } from '../game/research'
import { getMyEconomyMods, getMyResources, type MpBasics } from '../adapters/mpSelectors'

export function makeResearchLabel(gameMode: 'single'|'multiplayer', research: Research, multi?: MpBasics){
  return (track: 'Military'|'Grid'|'Nano') => {
    if (gameMode === 'multiplayer') {
      const mods = getMyEconomyMods(multi)
      return researchLabelWithMods(track, research, mods)
    }
    return researchLabelCore(track, research)
  }
}

export function makeCanResearch(gameMode: 'single'|'multiplayer', research: Research, resources: Resources, multi?: MpBasics){
  return (track: 'Military'|'Grid'|'Nano') => {
    if (gameMode === 'multiplayer') {
      const mods = getMyEconomyMods(multi)
      const res = getMyResources(multi, resources)
      return canResearchWithMods(track, research, res, mods)
    }
    return canResearchCore(track, research, resources)
  }
}
