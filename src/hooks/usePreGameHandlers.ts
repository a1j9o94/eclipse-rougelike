import type { Id } from '../../convex/_generated/dataModel'

export function usePreGameHandlers(params: {
  setCurrentRoomId: (id: Id<'rooms'> | null) => void
  setMultiplayerPhase: (p: 'menu'|'public'|'lobby'|'game') => void
  setGameMode: (m: 'single'|'multiplayer') => void
  setShowNewRun: (v: boolean) => void
  playEffect: (k: 'page') => void
}){
  const { setCurrentRoomId, setMultiplayerPhase, setGameMode, setShowNewRun, playEffect } = params

  function handleRoomJoined(roomId: string) {
    setCurrentRoomId(roomId as Id<'rooms'>)
    setMultiplayerPhase('lobby')
    playEffect('page')
  }

  function handleGameStart() {
    setMultiplayerPhase('game')
    playEffect('page')
  }

  function handleLeaveRoom() {
    setCurrentRoomId(null)
    setMultiplayerPhase('menu')
    playEffect('page')
  }

  function handleBackToMainMenu() {
    setGameMode('single')
    setMultiplayerPhase('menu')
    setCurrentRoomId(null)
    setShowNewRun(true)
    playEffect('page')
  }

  function handleContinue() {
    setShowNewRun(false)
    playEffect('page')
  }

  function handleGoMultiplayer() {
    setGameMode('multiplayer')
    setMultiplayerPhase('menu')
    playEffect('page')
  }

  function handleGoPublic() {
    setMultiplayerPhase('public')
    playEffect('page')
  }

  return {
    handleRoomJoined,
    handleGameStart,
    handleLeaveRoom,
    handleBackToMainMenu,
    handleContinue,
    handleGoMultiplayer,
    handleGoPublic,
  }
}

export default usePreGameHandlers
