import { useEffect, useState } from 'react'
import type { FrameId } from '../../../shared/frames'
import { partDescription, partEffects, type Part } from '../../../shared/parts'

type BlueprintPanelProps = {
  frameId: FrameId
  parts: Part[]
  sellFrameId: FrameId | null
  onSell: (frameId: FrameId, partIndex: number) => void
}

type BlueprintCardProps = {
  part: Part
  isOpen: boolean
  onToggle: () => void
  onSell: () => void
  canSell: boolean
}

export default function BlueprintPanel({ frameId, parts, sellFrameId, onSell }: BlueprintPanelProps){
  const [infoIdx, setInfoIdx] = useState<number | null>(null)

  useEffect(() => {
    setInfoIdx(null)
  }, [frameId, parts])

  const canSell = sellFrameId !== null

  return (
    <div data-tutorial="blueprint-panel" className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {parts.map((part, idx) => (
        <BlueprintCard
          key={part.id ?? idx}
          part={part}
          isOpen={infoIdx === idx}
          onToggle={() => setInfoIdx(infoIdx === idx ? null : idx)}
          onSell={() => {
            if (sellFrameId) onSell(sellFrameId, idx)
          }}
          canSell={canSell}
        />
      ))}
    </div>
  )
}

function BlueprintCard({ part, isOpen, onToggle, onSell, canSell }: BlueprintCardProps){
  const effects = partEffects(part)
  const refund = Math.floor((part.cost || 0) * 0.25)

  return (
    <div className="p-2 rounded border border-zinc-700 bg-zinc-900 text-xs">
      <div className="font-medium text-sm">{part.name}</div>
      <div className="opacity-70">{`${part.cat} • Tier ${part.tier}${effects.length ? ' • ' + effects.join(' • ') : ''}`}</div>
      <div className="mt-1 flex justify-between items-center gap-2">
        <span className="opacity-70">Refund {refund}¢</span>
        <div className="flex items-center gap-1">
          <button
            aria-label="Part info"
            onClick={onToggle}
            className="px-2 py-1 rounded bg-zinc-900 border border-zinc-700"
          >
            ?
          </button>
          <button
            onClick={onSell}
            disabled={!canSell}
            className={`px-2 py-1 rounded bg-rose-600 ${canSell ? '' : 'opacity-60 cursor-not-allowed'}`}
          >
            Sell
          </button>
        </div>
      </div>
      {isOpen && (
        <div className="mt-2 text-[11px] opacity-90">
          {partDescription(part)}
        </div>
      )}
    </div>
  )
}
