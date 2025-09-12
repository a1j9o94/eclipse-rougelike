import { useState } from 'react'
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
  onOpenTechs,
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
  onOpenTechs: () => void
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
  const [showHelpMenu, setShowHelpMenu] = useState(false)
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

      <ResourceBar {...resourceBar} />

      {route==='OUTPOST' && (<OutpostPage {...outpost} />)}
      {route==='COMBAT' && (<CombatPage {...combat} />)}

      <div className="fixed bottom-3 right-3 z-40 flex flex-col gap-2">
        <div className="hidden sm:flex flex-col gap-2">
          <button data-tutorial="help-tech" onClick={()=>{ try { tutorialEvent('opened-tech-list') } catch { /* noop */ } onOpenTechs() }} className="px-3 py-2 rounded-full bg-zinc-800 border border-zinc-700 text-xs">🔬 Tech</button>
          <button data-tutorial="help-rules" onClick={onOpenRules} className="px-3 py-2 rounded-full bg-zinc-800 border border-zinc-700 text-xs">❓ Rules</button>
        </div>
        <div className="sm:hidden">
          {showHelpMenu ? (
            <div className="flex flex-col gap-2">
              <button data-tutorial="help-tech" onClick={()=>{ try { tutorialEvent('opened-tech-list') } catch { /* noop */ } onOpenTechs(); setShowHelpMenu(false) }} className="px-3 py-2 rounded-full bg-zinc-800 border border-zinc-700 text-xs">🔬 Tech</button>
              <button data-tutorial="help-rules" onClick={()=>{ onOpenRules(); setShowHelpMenu(false) }} className="px-3 py-2 rounded-full bg-zinc-800 border border-zinc-700 text-xs">❓ Rules</button>
              <button onClick={()=>setShowHelpMenu(false)} className="px-3 py-2 rounded-full bg-zinc-800 border border-zinc-700 text-xs">✖</button>
            </div>
          ) : (
            <button data-tutorial="help-rules" onClick={()=>setShowHelpMenu(true)} className="px-3 py-2 rounded-full bg-zinc-800 border border-zinc-700 text-xs">❓</button>
          )}
        </div>
      </div>
    </div>
  )
}

export default GameShell
