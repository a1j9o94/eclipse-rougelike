import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { WinModal } from '../components/modals'

describe('WinModal', () => {
  it('provides an endless war option', () => {
    const onRestart = vi.fn()
    const onEndless = vi.fn()
    render(<WinModal onRestart={onRestart} onEndless={onEndless} />)
    const btn = screen.getByRole('button', { name: /Endless War/i })
    fireEvent.click(btn)
    expect(onEndless).toHaveBeenCalled()
  })
})
