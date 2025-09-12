// React import not required with modern JSX transform
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { computePlacement } from './placement'

type Rect = { top:number; left:number; width:number; height:number }

type Placement = { top:number; left:number }

function clamp(n:number, min:number, max:number){ return Math.min(Math.max(n, min), max) }

export default function CoachmarkOverlay({ visible, title, text, anchor, onNext }: {
  visible: boolean
  title?: string
  text?: string
  anchor?: string
  onNext?: () => void
}){
  const [rect, setRect] = useState<Rect | null>(null)
  const [pos, setPos] = useState<Placement>({ top: 24, left: 24 })
  const panelRef = useRef<HTMLDivElement>(null)
  const hiddenSizerRef = useRef<HTMLDivElement>(null)

  // Track anchor position
  useLayoutEffect(()=>{
    function measure(){
      if (!anchor) { setRect(null); return }
      const candidates = Array.from(document.querySelectorAll(`[data-tutorial="${anchor}"]`)) as HTMLElement[]
      const el = candidates.find(e => {
        const style = window.getComputedStyle(e)
        if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity || '1') === 0) return false
        const rr = e.getBoundingClientRect()
        return rr.width > 0 && rr.height > 0
      }) || candidates[0] || null
      if (!el) { setRect(null); return }
      const r = el.getBoundingClientRect()
      setRect({ top: r.top + window.scrollY, left: r.left + window.scrollX, width: r.width, height: r.height })
      // Ensure visibility
      try {
        // Keep the anchor comfortably visible with headroom to fit the panel
        const panelH = (hiddenSizerRef.current?.getBoundingClientRect().height || 120)
        const headroom = Math.min(220, Math.max(120, panelH + 24))
        const inView = (r.top >= 64) && (r.bottom <= (window.innerHeight - headroom))
        if (!inView) {
          const targetY = clamp(
            r.top + window.scrollY - Math.max(64, (window.innerHeight - r.height - headroom) / 2),
            0,
            document.documentElement.scrollHeight - window.innerHeight
          )
          window.scrollTo({ top: targetY, behavior: 'smooth' })
        }
      } catch { /* noop */ }
    }
    measure()
    const onScroll = () => measure()
    const onResize = () => measure()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
    const t = setInterval(measure, 500)
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onResize); clearInterval(t) }
  }, [anchor])

  // Position panel near anchor
  useEffect(()=>{
    const panel = panelRef.current
    if (!panel) return
    const panelW = Math.min(340, window.innerWidth - 24)
    const panelH = panel.getBoundingClientRect().height || 120

    // Avoid rectangles (sticky Start Combat bar etc.)
    const avoidRects: Rect[] = []
    try {
      const start = document.querySelector('[data-tutorial="start-combat"]') as HTMLElement | null
      if (start) { const s = start.getBoundingClientRect(); avoidRects.push({ top: s.top + window.scrollY, left: s.left + window.scrollX, width: s.width, height: s.height + 32 }) }
    } catch { /* noop */ }

    if (rect) {
      setPos(
        computePlacement({
          anchor: rect,
          panelW,
          panelH,
          viewport: { top: window.scrollY, left: window.scrollX, width: window.innerWidth, height: window.innerHeight },
          avoid: avoidRects,
          pad: 12,
        })
      )
    } else {
      setPos({ top: window.scrollY + 16, left: window.scrollX + 16 })
    }
  }, [rect])

  if (!visible) return null
  return (
    <div className="fixed inset-0 z-[80] p-0 bg-transparent pointer-events-none">
      {/* Highlight box over anchor */}
      {rect && (
        <div
          className="absolute border-2 border-emerald-400/80 rounded-xl shadow-[0_0_0_9999px_rgba(0,0,0,0.32)]"
          style={{ top: rect.top - window.scrollY - 6, left: rect.left - window.scrollX - 6, width: rect.width + 12, height: rect.height + 12 }}
        />
      )}
      {/* Callout panel */}
      {/* Hidden sizer for pre-measuring panel height when computing scroll headroom */}
      <div ref={hiddenSizerRef} className="absolute -top-[2000px] left-0 max-w-xs bg-transparent text-transparent">
        <div className="p-4 text-sm">{text || ''}</div>
        {onNext && <div className="mt-3"><button className="px-3 py-2">Next</button></div>}
      </div>
      <div
        ref={panelRef}
        className="absolute max-w-xs sm:max-w-sm bg-zinc-800/95 border border-zinc-500 rounded-2xl p-4 shadow-2xl text-zinc-50 pointer-events-auto touch-pan-y"
           style={{ top: pos.top - window.scrollY, left: pos.left - window.scrollX }}>
        {title && <div className="text-lg font-semibold mb-2">{title}</div>}
        {text && <div className="text-sm leading-relaxed">{text}</div>}
        {onNext && (
          <div className="mt-3 text-right">
            <button onClick={onNext} className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500">Next</button>
          </div>
        )}
      </div>
    </div>
  )
}
