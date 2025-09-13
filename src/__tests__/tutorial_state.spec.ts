import { describe, it, expect, beforeEach } from 'vitest'
import { isEnabled } from '../tutorial/state'

const KEY = 'eclipse-tutorial-v1'

describe('tutorial state', () => {
  beforeEach(() => {
    localStorage.removeItem(KEY)
  })

  it('is enabled by default', () => {
    expect(isEnabled()).toBe(true)
  })
})
