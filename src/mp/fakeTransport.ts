import type { GameState, MultiTransport, PlayerId, RoomState, Snapshot } from './transport'

type Subscriber = (room: RoomState, game: GameState) => void

type Room = {
  id: string
  room: RoomState
  game: GameState
  subs: Set<Subscriber>
}

const rooms = new Map<string, Room>()

function notify(r: Room) {
  for (const cb of r.subs) cb({ ...r.room, players: [...r.room.players] }, cloneGame(r.game))
}

function cloneGame(g: GameState): GameState {
  return {
    phase: g.phase,
    round: g.round,
    playerStates: Object.fromEntries(Object.entries(g.playerStates).map(([k, v]) => [k, { ...v, snapshot: v.snapshot ? { ...v.snapshot, blueprints: v.snapshot.blueprints ? { ...v.snapshot.blueprints } : undefined, fleet: v.snapshot.fleet ? [...v.snapshot.fleet] : undefined } : undefined } ])),
    modifiers: g.modifiers ? { ...g.modifiers } : undefined,
  }
}

function getOrCreateRoom(roomId: string): Room {
  let r = rooms.get(roomId)
  if (!r) {
    r = {
      id: roomId,
      room: { roomId, players: [], phase: 'lobby' },
      game: { phase: 'setup', round: 1, playerStates: {} },
      subs: new Set(),
    }
    rooms.set(roomId, r)
  }
  return r
}

export function createFakeTransport(roomId: string, playerId: PlayerId): MultiTransport {
  const r = getOrCreateRoom(roomId)
  if (!r.room.players.includes(playerId)) r.room.players.push(playerId)
  if (!r.game.playerStates[playerId]) r.game.playerStates[playerId] = { isReady: false, fleetValid: false }

  function maybeAdvance() {
    if (r.game.phase === 'setup') {
      const players = r.room.players
      if (players.length > 0 && players.every(pid => r.game.playerStates[pid]?.isReady)) {
        r.game.phase = 'combat'
        r.room.phase = 'combat'
        notify(r)
      }
    }
  }

  const transport: MultiTransport = {
    subscribe(cb) {
      r.subs.add(cb)
      cb({ ...r.room, players: [...r.room.players] }, cloneGame(r.game))
      return () => { r.subs.delete(cb) }
    },
    getRoom() { return { ...r.room, players: [...r.room.players] } },
    getGameState() { return cloneGame(r.game) },
    async setReady(ready: boolean) {
      r.game.playerStates[playerId] = { ...(r.game.playerStates[playerId] || { isReady: false, fleetValid: false }), isReady: ready }
      notify(r)
      maybeAdvance()
    },
    async updateFleetValidity(valid: boolean) {
      r.game.playerStates[playerId] = { ...(r.game.playerStates[playerId] || { isReady: false, fleetValid: false }), fleetValid: valid }
      notify(r)
    },
    async submitFleetSnapshot(snapshot: Snapshot) {
      r.game.playerStates[playerId] = { ...(r.game.playerStates[playerId] || { isReady: false, fleetValid: false }), snapshot }
      notify(r)
    },
    async updateGameState(updates) {
      r.game = { ...r.game, ...updates, playerStates: updates.playerStates ? { ...r.game.playerStates, ...updates.playerStates } : r.game.playerStates }
      if (typeof updates.phase === 'string') r.room.phase = updates.phase
      notify(r)
    },
    async leaveRoom() {
      r.room.players = r.room.players.filter(p => p !== playerId)
      delete r.game.playerStates[playerId]
      notify(r)
    },
    dispose() { /* no-op for fake */ },
  }
  notify(r)
  return transport
}

