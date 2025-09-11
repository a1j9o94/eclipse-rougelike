import type { ReactElement } from 'react'
import { createElement } from 'react'
import StartPage from '../pages/StartPage'
import MultiplayerStartPage from '../pages/MultiplayerStartPage'
import PublicLobbyPage from '../pages/PublicLobbyPage'
import { RoomLobby } from '../../components/RoomLobby'
import type { Id } from '../../convex/_generated/dataModel'
import type { DifficultyId } from '../../shared/types'
import type { FactionId } from '../../shared/factions'

export type PreGameRouterProps = {
  gameMode: 'single'|'multiplayer'
  showNewRun: boolean
  faction: string
  multiplayerPhase: 'menu'|'public'|'lobby'|'game'
  multiplayerStartMode?: 'menu'|'create'|'join'
  currentRoomId: Id<'rooms'> | null
  // handlers
  onNewRun: (diff: DifficultyId, faction: FactionId) => void
  onContinue: () => void
  onGoMultiplayer: (mode?: 'menu'|'create'|'join'|'public') => void
  onGoPublic: () => void
  onRoomJoined: (roomId: string) => void
  onBack: () => void
  onGameStart: () => void
  onLeaveRoom: () => void
}

export function getPreGameElement(props: PreGameRouterProps): ReactElement | null {
  const { gameMode, showNewRun, multiplayerPhase, currentRoomId } = props
  if (showNewRun && gameMode === 'single') {
    return createElement(StartPage, {
      onNewRun: props.onNewRun,
      onContinue: props.onContinue,
      onMultiplayer: props.onGoMultiplayer,
    })
  }

  if (gameMode === 'multiplayer') {
    if (multiplayerPhase === 'menu') {
      return createElement(MultiplayerStartPage, {
        onRoomJoined: props.onRoomJoined,
        onBack: props.onBack,
        currentFaction: props.faction,
        onGoPublic: props.onGoPublic,
        initialMode: props.multiplayerStartMode || 'menu',
      })
    }
    if (multiplayerPhase === 'public') {
      return createElement(PublicLobbyPage, {
        onBack: props.onBack,
        onRoomJoined: props.onRoomJoined,
      })
    }
    if (multiplayerPhase === 'lobby' && currentRoomId) {
      return createElement(RoomLobby, {
        roomId: currentRoomId,
        onGameStart: props.onGameStart,
        onLeaveRoom: props.onLeaveRoom,
      })
    }
    if (multiplayerPhase !== 'game') {
      return createElement('div', { className: 'min-h-screen text-zinc-100 flex items-center justify-center' },
        createElement('div', { className: 'text-center text-zinc-400' }, 'Preparing multiplayer lobby…')
      )
    }
  }

  return null
}
