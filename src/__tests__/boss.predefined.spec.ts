import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import App from '../App'
import { getOpponentFaction, getBossFleetFor, isValidShipBuild } from '../game'
import { generateEnemyFleetFor } from '../game/enemy'

describe('Predefined boss fleets and opponent selection', () => {
  it('selects a random opponent faction different from the player on new run', () => {
    render(React.createElement(App))
    fireEvent.click(screen.getByRole('button', { name: /Consortium of Scholars/i }))
    fireEvent.click(screen.getByRole('button', { name: /Easy/i }))
    fireEvent.click(screen.getByRole('button', { name: /Let’s go/i }))

    const opp = getOpponentFaction()
    expect(opp).toBeDefined()
    expect(opp).not.toEqual('scientists')
  })

  it('uses predefined boss fleet for opponent faction at sector 5 and 10', () => {
    const rnd = vi.spyOn(Math, 'random').mockReturnValue(0.5)
    render(React.createElement(App))
    fireEvent.click(screen.getByRole('button', { name: /Crimson Vanguard/i }))
    fireEvent.click(screen.getByRole('button', { name: /Easy/i }))
    fireEvent.click(screen.getByRole('button', { name: /Let’s go/i }))

    const opp = getOpponentFaction()
    // Sector 5
    const e5 = generateEnemyFleetFor(5)
    const spec5 = getBossFleetFor(opp, 5)
    expect(e5.length).toBe(spec5.ships.length)
    e5.forEach((ship, idx) => {
      const expected = spec5.ships[idx]
      expect(ship.frame.id).toBe(expected.frame)
      const partIds = ship.parts.map(p => p.id).sort()
      expect(partIds).toEqual([...expected.parts].sort())
      expect(isValidShipBuild(ship.frame, ship.parts)).toBe(true)
    })
    // Sector 10
    const e10 = generateEnemyFleetFor(10)
    const spec10 = getBossFleetFor(opp, 10)
    expect(e10.length).toBe(spec10.ships.length)
    e10.forEach((ship, idx) => {
      const expected = spec10.ships[idx]
      expect(ship.frame.id).toBe(expected.frame)
      const partIds = ship.parts.map(p => p.id).sort()
      expect(partIds).toEqual([...expected.parts].sort())
      expect(isValidShipBuild(ship.frame, ship.parts)).toBe(true)
    })
    rnd.mockRestore()
  })
})

