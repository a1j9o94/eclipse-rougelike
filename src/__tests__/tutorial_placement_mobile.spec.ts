import { computePlacement } from '../tutorial/placement'

describe('tutorial computePlacement (mobile-ish)', () => {
  const viewport = { top: 0, left: 0, width: 390, height: 844 } // iPhone 12/13 logical size

  it('places above when anchor near bottom', () => {
    const anchor = { top: 720, left: 16, width: 358, height: 60 }
    const pos = computePlacement({ anchor, panelW: 320, panelH: 140, viewport })
    expect(pos.top).toBeLessThan(anchor.top) // above
  })

  it('places below when space below is larger', () => {
    const anchor = { top: 120, left: 16, width: 358, height: 60 }
    const pos = computePlacement({ anchor, panelW: 320, panelH: 120, viewport })
    expect(pos.top).toBeGreaterThanOrEqual(anchor.top + anchor.height) // below
  })

  it('avoids overlapping a sticky bar', () => {
    const anchor = { top: 640, left: 16, width: 358, height: 160 } // tall list
    const sticky = { top: 740, left: 0, width: 390, height: 80 }
    const pos = computePlacement({ anchor, panelW: 320, panelH: 140, viewport, avoid: [sticky] })
    // Should choose a top above sticky region
    expect(pos.top + 140).toBeLessThanOrEqual(sticky.top)
  })
})

