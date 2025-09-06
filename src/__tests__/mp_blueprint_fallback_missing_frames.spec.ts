import { describe, it, expect } from 'vitest'
import { mapBlueprintIdsToParts } from '../multiplayer/blueprintHints'
import { INITIAL_BLUEPRINTS } from '../../shared/defaults'
import type { FrameId } from '../game'

describe('MP blueprint mapping — per-frame fallback', () => {
  it('backfills missing Interceptor blueprint with INITIAL when only Cruiser IDs exist (Warmongers case)', () => {
    const ids: Record<FrameId, string[]> = { interceptor: [], cruiser: ['tachyon_source','tachyon_drive','plasma_array','positron','gauss','composite'], dread: [] }
    const mapped = mapBlueprintIdsToParts(ids)
    // Interceptor should not be empty — use INITIAL blueprint so builds are valid
    expect(mapped.interceptor.map(p=>p.id)).toEqual(INITIAL_BLUEPRINTS.interceptor.map(p=>p.id))
    // Cruiser is mapped from ids, so must not equal INITIAL (which is empty by default)
    expect(mapped.cruiser.length).toBeGreaterThan(0)
  })
})
