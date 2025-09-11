import type { Id } from '../../convex/_generated/dataModel'

export function usePreGameHandlers(params: {
  setCurrentRoomId: (id: Id<'rooms'> | null) => void
  setMultiplayerPhase: (p: 'menu'|'public'|'lobby'|'game') => void
  setMultiplayerStartMode: (m: 'menu'|'create'|'join') => void
  setMultiplayerCreatePublic: (v: boolean) => void
  setGameMode: (m: 'single'|'multiplayer') => void
  setShowNewRun: (v: boolean) => void
  setOpenVersusOnHome: (v: boolean) => void
  playEffect: (k: 'page') => void
}){
  const { setCurrentRoomId, setMultiplayerPhase, setMultiplayerStartMode, setMultiplayerCreatePublic, setGameMode, setShowNewRun, setOpenVersusOnHome, playEffect } = params

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
    // Return all the way to Start page Versus sheet
    setGameMode('single')
    setShowNewRun(true)
    setOpenVersusOnHome(true)
    playEffect('page')
  }

  function handleBackToMainMenu() {
    setGameMode('single')
    setMultiplayerPhase('menu')
    setCurrentRoomId(null)
    setShowNewRun(true)
    setOpenVersusOnHome(true)
    playEffect('page')
  }

  function handleContinue() {
    setShowNewRun(false)
    playEffect('page')
  }

  function handleGoMultiplayer(mode: 'menu'|'create'|'join'|'public' = 'menu', opts?: { public?: boolean }) {
    setGameMode('multiplayer')
    setOpenVersusOnHome(false)
    setMultiplayerCreatePublic(Boolean(opts?.public))
    if (mode === 'public') {
      setMultiplayerPhase('public')
      setMultiplayerStartMode('menu')
    } else {
      setMultiplayerPhase('menu')
      setMultiplayerStartMode(mode)
    }
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
