import { describe, it, expect, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import CombatPage from '../pages/CombatPage'

describe('CombatPage fly-in intro', () => {
  it('wraps fleets with fly-in containers', async () => {
    vi.useFakeTimers()
    render(
      <CombatPage
        combatOver={false}
        outcome={''}
        roundNum={1}
        queue={[]}
        turnPtr={0}
        fleet={[] as any}
        enemyFleet={[] as any}
        log={[]}
        onReturn={() => {}}
      />
    )
    // Two fleet rows exist
    expect(screen.getAllByTestId('fleet-row')).toHaveLength(2)
    await act(async () => { vi.runAllTimers() })
    vi.useRealTimers()
  })
})
