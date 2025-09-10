import { useEffect, useRef } from 'react'

type Density = 'low'|'medium'|'high'

interface Props {
  enabled: boolean
  density: Density
  reducedMotion: boolean
}

// Lightweight, organic starfield drawn once to a canvas (no animation by default)
export default function Starfield({ enabled, density, reducedMotion }: Props) {
  const ref = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const starsRef = useRef<Array<{
    x: number
    y: number
    r: number
    a: number
    hue: number
    speed: number
    twinkle: number
    phase: number
    layer: 0|1
  }>>([])

  useEffect(() => {
    if (!enabled) return
    const canvas = ref.current
    if (!canvas) return

    let ctx: CanvasRenderingContext2D | null = null
    try { ctx = canvas.getContext('2d') } catch { return }
    if (!ctx) return

    const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1))
    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const w = Math.max(1, Math.floor(rect.width))
      const h = Math.max(1, Math.floor(rect.height))
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      draw(w, h)
    }

    const densityFactor = density === 'high' ? 0.25 : density === 'medium' ? 0.16 : 0.1

    const seedStars = (w: number, h: number) => {
      const area = w * h
      const count = Math.min(400, Math.floor(area / 10000 * densityFactor * 180))
      const arr: typeof starsRef.current = []
      for (let i = 0; i < count; i++) {
        const layer: 0|1 = Math.random() < 0.7 ? 0 : 1
        const r = layer === 0 ? Math.random()*0.8 + 0.2 : Math.random()*1.2 + 0.6
        const speed = layer === 0 ? (Math.random()*0.15 + 0.05) : (Math.random()*0.25 + 0.1)
        const hue = 200 + Math.random()*40 // bluish-white
        const a = Math.random()*0.5 + 0.3
        const twinkle = Math.random()*1.5 + 0.5
        arr.push({
          x: Math.random()*w,
          y: Math.random()*h,
          r,
          a,
          hue,
          speed,
          twinkle,
          phase: Math.random()*Math.PI*2,
          layer,
        })
      }
      starsRef.current = arr
    }

    const draw = (w: number, h: number, t: number) => {
      ctx.clearRect(0, 0, w, h)
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, w, h)

      // very faint vignette
      const grad = ctx.createRadialGradient(w*0.75, h*0.25, 0, w*0.75, h*0.25, Math.max(w,h))
      grad.addColorStop(0, 'rgba(56,189,248,0.035)')
      grad.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = grad
      ctx.fillRect(0,0,w,h)

      for (const s of starsRef.current) {
        // Drift to the right slightly; wrap around
        if (!reducedMotion) {
          s.x += s.speed
          if (s.x > w) s.x = 0
        }
        // Twinkle using a sine wave
        const tw = reducedMotion ? 1 : (0.75 + 0.25*Math.sin(t * 0.001 * s.twinkle + s.phase))
        ctx.beginPath()
        ctx.fillStyle = `hsla(${s.hue}, 40%, 90%, ${s.a * tw})`
        ctx.arc(s.x, s.y, s.r, 0, Math.PI*2)
        ctx.fill()
      }
    }

    const loop = (ts: number) => {
      const rect = canvas.getBoundingClientRect()
      // ensure stars exist and match current size
      if (starsRef.current.length === 0) seedStars(Math.floor(rect.width), Math.floor(rect.height))
      draw(Math.floor(rect.width), Math.floor(rect.height), ts)
      rafRef.current = requestAnimationFrame(loop)
    }

    resize()
    window.addEventListener('resize', resize)
    if (!reducedMotion) rafRef.current = requestAnimationFrame(loop)
    else draw(canvas.getBoundingClientRect().width, canvas.getBoundingClientRect().height, 0)

    return () => {
      window.removeEventListener('resize', resize)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [enabled, density, reducedMotion])

  return (
    <canvas ref={ref} className="fixed inset-0 z-0 block w-full h-full" aria-hidden />
  )
}
