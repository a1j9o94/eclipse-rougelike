// React import not required with modern JSX transform
import { ResourceBar } from './ui'
import { RulesModal, TechListModal, WinModal, MatchOverModal, MPWinModal } from './modals'
import { event as tutorialEvent } from '../tutorial/state'
import OutpostPage from '../pages/OutpostPage'
import CombatPage from '../pages/CombatPage'
import type { Research } from '../../shared/defaults'
import type { Ship, InitiativeEntry } from '../../shared/types'
import type { OutpostPageProps } from '../hooks/useOutpostPageProps'

export type RBProps = {
  credits: number
  materials: number
  science: number
  tonnage: { used: number; cap: number }
  sector: number
  onReset: () => void
  lives?: number
  multiplayer?: boolean
  onOpenRules?: () => void
  onOpenTechs?: () => void
}

export type CombatProps = {
  combatOver: boolean
  outcome: string
  roundNum: number
  queue: InitiativeEntry[]
  turnPtr: number
  fleet: Ship[]
  enemyFleet: Ship[]
  log: string[]
  onReturn: () => void | Promise<void>
  showRules?: boolean
  introActive?: boolean
  onIntroDone?: () => void
}

export function GameShell({
  showRules,
  onDismissRules,
  onOpenRules,
  showTechs,
  onCloseTechs,
  showWin,
  mpWinMessage,
  onRestartWin,
  onEndlessWin,
  matchOver,
  onMatchOverClose,
  resourceBar,
  route,
  outpost,
  combat,
}: {
  showRules: boolean
  onDismissRules: () => void
  onOpenRules: () => void
  showTechs: boolean
  // onOpenTechs removed from chrome; Techs accessible from Outpost view
  onCloseTechs: () => void
  showWin: boolean
  mpWinMessage?: string | null
  onRestartWin: () => void
  onEndlessWin: () => void
  matchOver: { winnerName: string } | null
  onMatchOverClose: () => void
  resourceBar: RBProps
  route: 'OUTPOST'|'COMBAT'
  outpost: OutpostPageProps
  combat: CombatProps
}){
  // Help menu bubble removed; actions moved into ResourceBar menu
  const openRulesWrapped = () => { try { tutorialEvent('opened-rules') } catch { /* noop */ } onOpenRules() }
  return (
    <div className="min-h-screen text-zinc-100">
      {matchOver && (
        <MatchOverModal winnerName={matchOver.winnerName} onClose={onMatchOverClose} />
      )}
      {showRules && <RulesModal onDismiss={onDismissRules} />}
      {showTechs && <TechListModal research={outpost.research as Research} onClose={()=>{ try { tutorialEvent('viewed-tech-list') } catch { /* noop */ } onCloseTechs() }} />}
      {showWin && (mpWinMessage ? (
        <MPWinModal message={mpWinMessage} onClose={onRestartWin} />
      ) : (
        <WinModal onRestart={onRestartWin} onEndless={onEndlessWin} />
      ))}

      <ResourceBar {...resourceBar} onOpenRules={openRulesWrapped} />

      {route==='OUTPOST' && (<OutpostPage {...outpost} />)}
      {route==='COMBAT' && (<CombatPage {...combat} />)}

      {/* Help actions moved into ResourceBar menu (⋯) */}
    </div>
  )
}

export default GameShell
