// React import not required with modern JSX transform
import { useEffect, useLayoutEffect, useRef, useState } from 'react'

type Rect = { top:number; left:number; width:number; height:number }

export default function CoachmarkOverlay({
  visible,
  title,
  text,
  anchor,
}: {
  visible: boolean
  title?: string
  text?: string
  anchor?: string
}){
  if (!visible) return null
  const [rect, setRect] = useState<Rect | null>(null)
  const [pos, setPos] = useState<{ top:number; left:number }>({ top: 24, left: 24 })
  const panelRef = useRef<HTMLDivElement>(null)

  // Track anchor position
  useLayoutEffect(()=>{
    function measure(){
      if (!anchor) { setRect(null); return }
      const el = document.querySelector(`[data-tutorial="${anchor}"]`) as HTMLElement | null
      if (!el) { setRect(null); return }
      const r = el.getBoundingClientRect()
      setRect({ top: r.top + window.scrollY, left: r.left + window.scrollX, width: r.width, height: r.height })
      // Ensure visibility
      try {
        const inView = r.top >= 64 && r.bottom <= (window.innerHeight - 100)
        if (!inView) el.scrollIntoView({ block: 'center', behavior: 'smooth' })
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
    const panelW = Math.min(320, window.innerWidth - 24)
    const panelH = panel.getBoundingClientRect().height || 120
    if (rect) {
      // Preferred placement: right of anchor; fallback to left; then below
      let tryLeft = rect.left + rect.width + 16
      let tryTop = rect.top
      if (tryLeft + panelW > window.scrollX + window.innerWidth - 12) {
        tryLeft = rect.left - panelW - 16
      }
      if (tryLeft < 12) {
        tryLeft = rect.left
        tryTop = rect.top + rect.height + 12
      }
      const left = Math.min(Math.max(tryLeft, 12), window.scrollX + window.innerWidth - panelW - 12)
      const top = Math.min(Math.max(tryTop, window.scrollY + 12), window.scrollY + window.innerHeight - panelH - 12)
      setPos({ top, left })
    } else {
      setPos({ top: window.scrollY + 16, left: window.scrollX + 16 })
    }
  }, [rect])

  return (
    <div className="fixed inset-0 z-[80] p-0 bg-transparent pointer-events-none">
      {/* Highlight box over anchor */}
      {rect && (
        <div
          className="absolute border-2 border-emerald-400/80 rounded-xl shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]"
          style={{ top: rect.top - window.scrollY - 6, left: rect.left - window.scrollX - 6, width: rect.width + 12, height: rect.height + 12 }}
        />
      )}
      {/* Callout panel */}
      <div ref={panelRef} className="absolute max-w-xs bg-zinc-950/95 border border-zinc-700 rounded-2xl p-4 shadow-2xl text-zinc-100 pointer-events-auto"
           style={{ top: pos.top - window.scrollY, left: pos.left - window.scrollX }}>
        {title && <div className="text-lg font-semibold mb-2">{title}</div>}
        {text && <div className="text-sm leading-relaxed">{text}</div>}
      </div>
    </div>
  )
}
