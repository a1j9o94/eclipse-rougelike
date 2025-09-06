// React import not required with modern JSX transform
import { useRef, useState, useEffect } from 'react'
import { CompactShip } from './ui'
import type { Ship } from '../../shared/types'
import { groupFleet } from '../game'

export function FleetRow({ ships, side, activeIdx }:{ ships:Ship[], side:'P'|'E', activeIdx:number }){
  const ref = useRef<HTMLDivElement>(null)
  const [dims, setDims] = useState({ width: 0, card: 0 })

  useEffect(() => {
    const measure = () => {
      const w = ref.current?.offsetWidth || 0
      const cardEl = ref.current?.querySelector('[data-ship]') as HTMLElement | null
      const c = cardEl?.offsetWidth || 0
      setDims({ width: w, card: c })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [ships])

  const cardWidth = dims.card || 80
  const alive = ships.map((ship, idx) => ({ ship, idx })).filter(({ ship }) => ship.alive && ship.hull > 0)
  let groups = alive.map(({ ship, idx }) => ({ ship, count:1, indices:[idx] }))

  if (dims.width && alive.length > 1){
    const spacing = (dims.width - cardWidth) / (alive.length - 1)
    if (spacing < cardWidth){
      groups = groupFleet(alive.map(a=>a.ship)).map(g => {
        const mapped = g.indices.map(i => alive[i].idx)
        const sorted = [...mapped].sort((a,b)=> ships[a].hull - ships[b].hull)
        return { ...g, indices: sorted, ship: ships[sorted[0]] }
      })
    }
  }

  const n = groups.length
  const step = n>1 && dims.width ? Math.min(cardWidth + 8, (dims.width - cardWidth)/(n-1)) : cardWidth + 8

  return (
    <div ref={ref} data-testid="fleet-row" className="relative h-36 w-full">
      {groups.map((g,i)=>{
        const stack = Math.min(g.count-1,2)
        const isActive = g.indices.includes(activeIdx)
        return (
          <div key={i} data-testid="fleet-ship" className="absolute top-0" style={{ left: `${i*step}px` }}>
            {Array.from({length: stack}).map((_,j)=>(
              <div key={j} className={`pointer-events-none absolute inset-0 rounded-xl border ${side==='P'? 'border-sky-600/60 bg-slate-900':'border-pink-600/60 bg-zinc-900'}`} style={{transform:`translate(${(j+1)*4}px, ${(j+1)*4}px)`}} />
            ))}
            {g.count>1 && <div className="absolute -top-2 -left-2 bg-zinc-800 px-1 rounded text-xs">×{g.count}</div>}
            <CompactShip ship={g.ship} side={side} active={isActive} />
          </div>
        )
      })}
    </div>
  )
}

export default FleetRow
