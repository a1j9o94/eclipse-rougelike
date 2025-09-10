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

  useEffect(() => {
    if (!enabled) return
    const canvas = ref.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
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

    const densityFactor = density === 'high' ? 0.22 : density === 'medium' ? 0.14 : 0.08

    const draw = (w: number, h: number) => {
      ctx.clearRect(0, 0, w, h)
      // Background
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, w, h)

      // Subtle vignette/nebula
      const grad = ctx.createRadialGradient(w*0.8, h*0.2, 0, w*0.8, h*0.2, Math.max(w,h))
      grad.addColorStop(0, 'rgba(56,189,248,0.05)')
      grad.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, w, h)

      const area = w * h
      const count = Math.floor(area / 10000 * densityFactor) // ~ scaled by viewport

      // Draw stars with random size and brightness
      for (let i = 0; i < count; i++) {
        const x = Math.random() * w
        const y = Math.random() * h
        const r = Math.random() * 0.9 + 0.4 // 0.4–1.3 px
        const a = Math.random() * 0.6 + 0.3 // 0.3–0.9 alpha
        ctx.beginPath()
        ctx.fillStyle = `rgba(255,255,255,${a})`
        ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.fill()
      }

      // Occasional brighter stars
      const bright = Math.max(2, Math.floor(count * 0.03))
      for (let i = 0; i < bright; i++) {
        const x = Math.random() * w
        const y = Math.random() * h
        const r = Math.random() * 1.6 + 0.8
        ctx.beginPath()
        ctx.fillStyle = 'rgba(255,255,255,0.95)'
        ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [enabled, density, reducedMotion])

  return (
    <canvas ref={ref} className="fixed inset-0 z-0 block w-full h-full" aria-hidden />
  )
}
