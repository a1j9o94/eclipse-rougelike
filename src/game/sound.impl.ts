import explosionUrl from '../assets/audio/Explosion.mp3'
import shopMusicUrl from '../assets/audio/Shop background music.mp3'
import combatMusicUrl from '../assets/audio/Start and combat background music.wav'
import lostMusicUrl from '../assets/audio/Lost screen music.wav'
import shotUrl from '../assets/audio/Weapon shot.wav'
import startCombatUrl from '../assets/audio/starting combat.wav'
import equipUrl from '../assets/audio/equipping part.wav'
import rerollUrl from '../assets/audio/shop reroll.wav'
import dockUrl from '../assets/audio/dock expansion.wav'
import pageUrl from '../assets/audio/Page transition.wav'
import factionUrl from '../assets/audio/faction selection.wav'
import techUrl from '../assets/audio/tech upgrade.wav'
import type { EffectKey, MusicKey } from './sound.types'

const effectSources: Record<EffectKey, string> = {
  shot: shotUrl,
  explosion: explosionUrl,
  startCombat: startCombatUrl,
  equip: equipUrl,
  reroll: rerollUrl,
  dock: dockUrl,
  page: pageUrl,
  faction: factionUrl,
  tech: techUrl,
}

const musicSources: Record<MusicKey, string> = {
  shop: shopMusicUrl,
  combat: combatMusicUrl,
  lost: lostMusicUrl,
}

const effects = Object.fromEntries(
  Object.entries(effectSources).map(([k, src]) => [k, new Audio(src)])
) as Record<EffectKey, HTMLAudioElement>

const music = Object.fromEntries(
  Object.entries(musicSources).map(([k, src]) => [k, new Audio(src)])
) as Record<MusicKey, HTMLAudioElement>

let currentMusic: HTMLAudioElement | null = null
const EFFECT_DURATION = 1000

export function playEffect(key: EffectKey, duration: number = EFFECT_DURATION): Promise<void> {
  const audio = effects[key]
  audio.currentTime = 0
  void audio.play().catch(() => {})
  return new Promise(resolve => {
    const done = () => {
      audio.pause()
      audio.currentTime = 0
      resolve()
    }
    setTimeout(done, duration)
  })
}

export function playMusic(key: MusicKey): void {
  const audio = music[key]
  if (currentMusic === audio) return
  if (currentMusic) {
    currentMusic.pause()
    currentMusic.currentTime = 0
  }
  audio.loop = true
  audio.currentTime = 0
  void audio.play().catch(() => {})
  currentMusic = audio
}

export function stopMusic(): void {
  if (currentMusic) {
    currentMusic.pause()
    currentMusic.currentTime = 0
    currentMusic = null
  }
}

