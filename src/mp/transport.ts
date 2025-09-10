export type PlayerId = string
export type Phase = 'menu'|'lobby'|'setup'|'combat'|'finished'

export type Snapshot = { blueprints?: Record<string, string[]>; fleet?: string[] }
export type PlayerState = { isReady: boolean; fleetValid: boolean; snapshot?: Snapshot }
export type RoomState = { roomId: string; players: PlayerId[]; phase: Phase }
export type GameState = { phase: Phase; round: number; playerStates: Record<PlayerId, PlayerState>; modifiers?: Record<string, string|number|boolean> }

export interface MultiTransport {
  subscribe(cb: (room: RoomState, game: GameState) => void): () => void
  getRoom(): RoomState | null
  getGameState(): GameState | null
  setReady(ready: boolean): Promise<void>
  updateFleetValidity(valid: boolean): Promise<void>
  submitFleetSnapshot(snapshot: Snapshot): Promise<void>
  updateGameState(updates: Partial<GameState>): Promise<void>
  leaveRoom(): Promise<void>
  dispose(): void
}

