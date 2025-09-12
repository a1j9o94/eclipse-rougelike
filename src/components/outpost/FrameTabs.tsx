// React import not required
export type FrameTab = 'interceptor'|'cruiser'|'dread'

export default function FrameTabs({ active, counts, onChange }:{ active: FrameTab, counts: Record<FrameTab, number>, onChange:(t:FrameTab)=>void }){
  const tabs: FrameTab[] = ['interceptor','cruiser','dread']
  const label = (t:FrameTab) => t==='interceptor'?'Interceptor':(t==='cruiser'?'Cruiser':'Dreadnought')
  return (
    <div className="inline-flex rounded-xl overflow-hidden ring-1 ring-white/10" role="tablist">
      {tabs.map(t => (
        <button key={t} role="tab" aria-selected={active===t} onClick={()=>onChange(t)} className={`px-3 py-1.5 text-sm flex items-center gap-1 ${active===t? 'bg-white/10' : 'bg-black/30 hover:bg-black/40'}`}>
          <span>{label(t)}</span>
          <span className="text-xs opacity-80">×{counts[t]||0}</span>
        </button>
      ))}
    </div>
  )
}

