import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RulesModal, TechListModal } from '../components/modals'

describe('Help menu modals', () => {
  it('renders Rules and Tech modals and shows expected content', async () => {
    render(<RulesModal onDismiss={()=>{}} />)
    expect(await screen.findByText(/How to Play/i)).toBeInTheDocument()
    // Render Tech list directly
    const research = { Military:1, Grid:1, Nano:1 } as any
    render(<TechListModal research={research} onClose={()=>{}} />)
    expect(await screen.findByText(/Tech List/i)).toBeInTheDocument()
  }, 15000)
})
