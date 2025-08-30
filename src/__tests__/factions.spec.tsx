import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import App from '../App'
import { getFaction } from '../config/factions'

describe('Factions', () => {
  it('Scientists start at Tier 2 across all tracks', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /Consortium of Scholars/i }))
    fireEvent.click(screen.getByRole('button', { name: /Easy/i }))
    fireEvent.click(screen.getByRole('button', { name: /Let’s go/i }))
    fireEvent.click(screen.getByRole('button', { name: /^Outpost$/i }))
    expect(screen.getByRole('button', { name: /Military 2→3/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Grid 2→3/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Nano 2→3/i })).toBeInTheDocument()
  })

  it('Warmongers start with a Cruiser on the field', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /Crimson Vanguard/i }))
    fireEvent.click(screen.getByRole('button', { name: /Easy/i }))
    expect(screen.getAllByText(/Cruiser/i).length).toBeGreaterThan(0)
  })

  it('Raiders start with T2 weapon (Antimatter Cannon) on Interceptor', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /Void Corsairs/i }))
    fireEvent.click(screen.getByRole('button', { name: /Easy/i }))
    fireEvent.click(screen.getByRole('button', { name: /Let’s go/i }))
    expect(screen.getAllByText(/Antimatter Cannon/i).length).toBeGreaterThan(0)
  })

  it('Industrialists start with free reroll and discounted build costs', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /Helios Cartel/i }))
    fireEvent.click(screen.getByRole('button', { name: /Easy/i }))
    fireEvent.click(screen.getByRole('button', { name: /Let’s go/i }))
    fireEvent.click(screen.getByRole('button', { name: /^Outpost$/i }))
    expect(screen.getByRole('button', { name: /Reroll \(0¢\)/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Build Interceptor \(2🧱 \+ 1¢\)/i })).toBeInTheDocument()
  })

  it('Faction config exposes starting frame and capacity', () => {
    const warmongers = getFaction('warmongers')
    expect(warmongers.config.startingFrame).toBe('cruiser')
    expect(warmongers.config.capacity).toBeGreaterThan(10)
  })
})
