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
    // Present on mount
    expect(screen.getByTestId('flyin-top')).toBeInTheDocument()
    expect(screen.getByTestId('flyin-bottom')).toBeInTheDocument()
    await act(async () => { vi.runAllTimers() })
    // Classes should transition away from opacity-0 after tick
    expect(screen.getByTestId('flyin-top').className).toMatch(/opacity-1|opacity-100|translate-y-0/)
    expect(screen.getByTestId('flyin-bottom').className).toMatch(/opacity-1|opacity-100|translate-y-0/)
    vi.useRealTimers()
  })
})
