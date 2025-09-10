import { useEffect } from 'react'

export function useAutoStepper(params: {
  enabled: boolean
  step: () => Promise<void>
  deps: unknown[]
}){
  const { enabled, step, deps } = params
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(()=>{
    if(!enabled) return
    let cancelled = false
    let handle: ReturnType<typeof setTimeout> | null = null
    const tick = async()=>{ if(cancelled) return; await step(); if(cancelled) return; handle = setTimeout(tick, 100); (handle as unknown as { unref?: () => void })?.unref?.() }
    tick()
    return ()=>{ cancelled=true; if (handle) clearTimeout(handle) }
  }, [enabled, step, ...deps])
}

export default useAutoStepper
