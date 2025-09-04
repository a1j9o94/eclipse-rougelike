import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import App from '../App'
import { getFaction } from '../config/factions'

describe('Factions', () => {
  it('Scientists start at Tier 2 across all tracks', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /Consortium of Scholars/i }))
    fireEvent.click(screen.getByRole('button', { name: /Easy/i }))
    fireEvent.click(screen.getByRole('button', { name: /Let’s go/i }))
    fireEvent.click(screen.getByRole('button', { name: /Auto/i }))
    await screen.findByText(/^Victory$/i, undefined, { timeout: 10000 })
    fireEvent.click(screen.getByRole('button', { name: /Return to Outpost/i }))
    await screen.findByRole('button', { name: /Military 2→3/i })
    expect(screen.getByRole('button', { name: /Grid 2→3/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Nano 2→3/i })).toBeInTheDocument()
  }, 20000)

  it('Warmongers start with a Cruiser on the field', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /Crimson Vanguard/i }))
    fireEvent.click(screen.getByRole('button', { name: /Easy/i }))
    expect(screen.getAllByTitle(/Cruiser/i).length).toBeGreaterThan(0)
  })

  it('Raiders start with T2 weapon (Antimatter Cannon) on Interceptor', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /Void Corsairs/i }))
    fireEvent.click(screen.getByRole('button', { name: /Easy/i }))
    fireEvent.click(screen.getByRole('button', { name: /Let’s go/i }))
    const icons = screen.getAllByTestId('frame-slot-filled').map(el => el.textContent)
    expect(icons).toContain('🎲')
  })

  it('Industrialists start with free reroll and discounted build costs', () => {
    const f = getFaction('industrialists')
    expect(f.config.economy?.rerollBase).toBe(0)
    expect(f.config.economy?.creditMultiplier).toBeLessThan(1)
  })

  it('Faction config exposes starting frame and capacity', () => {
    const warmongers = getFaction('warmongers')
    expect(warmongers.config.startingFrame).toBe('cruiser')
    expect(warmongers.config.capacity).toBeGreaterThan(10)
  })

  it('Timekeepers start with Disruptor Beam blueprint', () => {
    const f = getFaction('timekeepers')
    const ids = f.config.blueprints.interceptor.map(p=>p.id)
    expect(ids).toContain('disruptor')
  })

  it('Collective begin with Auto-Repair Hull', () => {
    const f = getFaction('collective')
    const ids = f.config.blueprints.interceptor.map(p=>p.id)
    expect(ids).toContain('auto_repair')
  })
})
