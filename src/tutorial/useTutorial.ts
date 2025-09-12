import { useEffect, useState, useCallback } from 'react'
import { isEnabled, getStep, event as tutorialEvent, disable as tutorialDisable, type TutorialStepId } from './state'

export function useTutorial(){
  const [enabled, setEnabled] = useState<boolean>(isEnabled())
  const [step, setStep] = useState<TutorialStepId>(getStep())

  const refresh = useCallback(()=>{ setEnabled(isEnabled()); setStep(getStep()) },[])

  const next = useCallback(()=>{ tutorialEvent('next'); refresh() },[refresh])
  const skip = useCallback(()=>{ tutorialDisable(); refresh() },[refresh])

  useEffect(()=>{
    const onStorage = (e: StorageEvent) => { if (e.key === 'eclipse-tutorial-v1') refresh() }
    const onChanged = () => refresh()
    window.addEventListener('storage', onStorage)
    window.addEventListener('tutorial-changed', onChanged as EventListener)
    // sync once on mount in case state was just updated this tick
    refresh()
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('tutorial-changed', onChanged as EventListener)
    }
  }, [refresh])

  return { enabled, step, next, skip }
}

export default useTutorial
