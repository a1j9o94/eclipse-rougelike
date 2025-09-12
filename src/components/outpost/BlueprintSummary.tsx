// React import not required
import { PowerBadge } from '../ui'
import type { Ship } from '../../../shared/types'

export default function BlueprintSummary({ ship }:{ ship: Ship | undefined }){
  if (!ship) return null
  return (
    <div className="flex items-center gap-2 text-xs sm:text-sm mb-2">
      <PowerBadge use={ship.stats.powerUse} prod={ship.stats.powerProd} />
      <span>🚀 {ship.stats.init}</span>
      <span>🎯 {ship.stats.aim}</span>
      <span>🛡️ {ship.stats.shieldTier}</span>
      <span>❤️ {ship.stats.hullCap}</span>
      <span>⬛ {ship.parts.length}/{ship.frame.tiles}</span>
    </div>
  )
}

