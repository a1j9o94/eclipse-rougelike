import { useEffect, useState } from 'react'
import Starfield from './Starfield'

type Density = 'low'|'medium'|'high'

export default function GlobalStarfield(){
  const [enabled, setEnabled] = useState<boolean>(true)
  const [density, setDensity] = useState<Density>('medium')
  const [reduced, setReduced] = useState<boolean>(false)

  const read = () => {
    try {
      const en = localStorage.getItem('ui-starfield-enabled')
      const den = localStorage.getItem('ui-starfield-density') as Density | null
      const rm = localStorage.getItem('ui-reduced-motion')
      if (en!=null) setEnabled(en==='true')
      if (den==='low'||den==='medium'||den==='high') setDensity(den)
      if (rm!=null) setReduced(rm==='true')
    } catch { /* ignore */ }
  }

  useEffect(()=>{
    read()
    const onStorage = () => read()
    const onCustom = () => read()
    window.addEventListener('storage', onStorage)
    window.addEventListener('starfield-settings-changed', onCustom as EventListener)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('starfield-settings-changed', onCustom as EventListener)
    }
  },[])

  if (!enabled) return null
  return <Starfield enabled={enabled} density={density} reducedMotion={reduced} />
}

