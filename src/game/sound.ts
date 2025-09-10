import type { EffectKey, MusicKey } from './sound.types'

type Meta = { vitest?: unknown; env?: { MODE?: string } }
const meta = import.meta as unknown as Meta
const IS_TEST = Boolean(meta?.vitest || meta?.env?.MODE === 'test')

let implPromise: Promise<typeof import('./sound.impl')> | null = null
function getImpl() {
  if (!implPromise) implPromise = import('./sound.impl')
  return implPromise
}

export function playEffect(key: EffectKey, duration?: number): Promise<void> {
  if (IS_TEST) return Promise.resolve()
  return getImpl().then(m => m.playEffect(key, duration))
}

export function playMusic(key: MusicKey): void {
  if (IS_TEST) return
  void getImpl().then(m => m.playMusic(key))
}

export function stopMusic(): void {
  if (IS_TEST) return
  void getImpl().then(m => m.stopMusic())
}

export type { EffectKey, MusicKey }
