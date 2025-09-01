import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CombatPlanModal } from '../components/modals'

describe('CombatPlanModal endless mode', () => {
  it('shows upcoming sectors beyond 10', () => {
    render(<CombatPlanModal onClose={()=>{}} sector={11} endless={true} />)
    expect(screen.getByText(/Sector 11/)).toBeInTheDocument()
    expect(screen.getByText(/Sector 15/)).toBeInTheDocument()
  })
})
