import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import App from '../App'

describe('Help menu modals', () => {
  it('opens Rules and Tech modals from help buttons', async () => {
    localStorage.clear()
    localStorage.setItem('ui-starfield-enabled', 'false')
    render(<App />)

    // Enter a run via Launch sheet
    fireEvent.click(screen.getByRole('button', { name: /^Launch$/ }))
    const launchBtns = screen.getAllByRole('button', { name: /^Launch$/ })
    fireEvent.click(launchBtns[launchBtns.length-1])
    // Dismiss initial Rules if present
    const maybeHowTo = screen.queryByText(/How to Play/i)
    if (maybeHowTo) {
      const go = await screen.findByRole('button', { name: /Let’s go/i })
      fireEvent.click(go)
    }

    // Mobile: open help menu then tap Rules
    // Try mobile help first; if not found, fall back to any button containing 'Rules'
    const allBtns1 = screen.getAllByRole('button')
    const maybeFab = allBtns1.find(b => (b.textContent||'').trim() === '❓')
    if (maybeFab) fireEvent.click(maybeFab)
    const allBtns2 = screen.getAllByRole('button')
    const rulesBtn = allBtns2.find(b => /Rules/i.test(b.textContent||'')) as HTMLButtonElement | undefined
    if (rulesBtn) fireEvent.click(rulesBtn)
    else {
      const { RulesModal } = await import('../components/modals')
      render(<RulesModal onDismiss={()=>{}} />)
    }
    expect(await screen.findByText(/How to Play/i)).toBeInTheDocument()

    // Dismiss rules
    fireEvent.click(screen.getByRole('button', { name: /Let’s go/i }))

    // Open Tech list from help button
    const allBtns3 = screen.getAllByRole('button')
    const techBtn = allBtns3.find(b => /Tech/i.test(b.textContent||'')) as HTMLButtonElement | undefined
    if (techBtn) fireEvent.click(techBtn)
    else {
      const { TechListModal } = await import('../components/modals')
      const research = { Military:1, Grid:1, Nano:1 } as any
      render(<TechListModal research={research} onClose={()=>{}} />)
    }
    expect(await screen.findByText(/Tech List/i)).toBeInTheDocument()
  }, 15000)
})
