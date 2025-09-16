import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderOutpost } from '../test/harness/renderOutpost'
import { getBossVariants, getOpponentFaction, getBossFleetFor, setOpponentFaction } from '../game'
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

  it('Enemy Intel (SP) shows boss variant labels for sectors 5 and 10', async () => {
    let seed = 1
    const rand = vi.spyOn(Math, 'random').mockImplementation(() => {
      seed = (seed * 16807) % 2147483647
      return (seed - 1) / 2147483646
    })
    renderOutpost()
    // Open Enemy Intel from Outpost
    await screen.findByRole('button', { name: /Enemy Intel/i })
    fireEvent.click(screen.getByRole('button', { name: /Enemy Intel/i }))
    rand.mockRestore()

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

    // Boss rows should stack tonnage info beneath the fleet preview (no nowrap / flex-column layout)
    const tonnageLabels = screen.getAllByText(/Enemy tonnage/i)
    const bossLabel = tonnageLabels.find(el => el.parentElement?.textContent?.includes('(Boss)'))
    expect(bossLabel).toBeTruthy()
    expect(bossLabel?.className).not.toMatch(/whitespace-nowrap/)
    const bossRow = bossLabel?.parentElement
    expect(bossRow?.className || '').toMatch(/flex-col/)
  }, 20000)

  it('boss generation uses predefined opponent faction fleets at sector 5', () => {
    // Pick a known opponent explicitly
    setOpponentFaction('warmongers')
    const opp = getOpponentFaction()
    const expected = getBossFleetFor(opp, 5)
    const eFleet = generateEnemyFleetFor(5)
    expect(eFleet.length).toBe(expected.ships.length)
  })
})
