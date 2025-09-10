import { describe, it, expect } from 'vitest'
import { selectFleetValidity } from '../selectors/guards'

describe('selectors/guards — selectFleetValidity', () => {
  it('uses local when server is null/undefined', () => {
    expect(selectFleetValidity(true, null)).toBe(true)
    expect(selectFleetValidity(false, undefined)).toBe(false)
  })
  it('ANDs server and local when server is boolean', () => {
    expect(selectFleetValidity(true, true)).toBe(true)
    expect(selectFleetValidity(true, false)).toBe(false)
    expect(selectFleetValidity(false, true)).toBe(false)
  })
})

