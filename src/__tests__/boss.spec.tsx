import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import App from '../App'
import { getBossVariants, getOpponentFaction, getBossFleetFor } from '../game'
import { generateEnemyFleetFor } from '../game/enemy'

describe('Boss variants and planning', () => {

  it('defines 3 boss variants for sectors 5 and 10 with labels', () => {
    const v5 = getBossVariants(5)
    const v10 = getBossVariants(10)
    expect(v5.length).toBe(3)
    expect(v10.length).toBe(3)
    // Labels should be human-friendly hints for planning
    const v5Labels = v5.map(v => v.label)
    const v10Labels = v10.map(v => v.label)
    expect(v5Labels.join(', ')).toMatch(/High Aim/i)
    expect(v5Labels.join(', ')).toMatch(/High Shields|Tanky/i)
    expect(v5Labels.join(', ')).toMatch(/Alpha Strike|Burst/i)
    expect(v10Labels.join(', ')).toMatch(/Tier 3|T3/i)
  })

  it('Combat Plan shows boss variant labels for sectors 5 and 10', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /Consortium of Scholars/i }))
    fireEvent.click(screen.getByRole('button', { name: /Easy/i }))
    fireEvent.click(screen.getByRole('button', { name: /Let’s go/i }))
    fireEvent.click(screen.getByRole('button', { name: /Auto/i }))
    await screen.findByText(/^Victory$/i, undefined, { timeout: 10000 })
    fireEvent.click(screen.getByRole('button', { name: /Return to Outpost/i }))
    await screen.findByRole('button', { name: /Combat Plan/i })
    fireEvent.click(screen.getByRole('button', { name: /Combat Plan/i }))

    // Sector rows appear with variants summary for boss sectors
    const s5 = screen.getByText(/Sector 5 \(Boss\)/i)
    expect(s5).toBeInTheDocument()
    const s10 = screen.getByText(/Sector 10 \(Boss\)/i)
    expect(s10).toBeInTheDocument()

    // Expect a variants line beneath or alongside indicating 3 entries
    const variantLines = screen.getAllByText(/Variants:\s*/i)
    expect(variantLines.length).toBeGreaterThanOrEqual(2)

    // Probe labels exist somewhere in the modal (avoid ambiguity between sector 5 and 10)
    const texts = variantLines.map(el => el.parentElement?.textContent || '')
    expect(texts.join(' | ')).toMatch(/High Aim/i)
    expect(texts.join(' | ')).toMatch(/High Shields|Tanky/i)
  }, 20000)

  it('boss generation uses predefined opponent faction fleets at sector 5', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /Consortium of Scholars/i }))
    fireEvent.click(screen.getByRole('button', { name: /Easy/i }))
    fireEvent.click(screen.getByRole('button', { name: /Let’s go/i }))

    const opp = getOpponentFaction()
    const expected = getBossFleetFor(opp, 5)
    const eFleet = generateEnemyFleetFor(5)
    expect(eFleet.length).toBe(expected.ships.length)
  })
})


