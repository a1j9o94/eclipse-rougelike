export type Rect = { top:number; left:number; width:number; height:number }

function clamp(n:number, min:number, max:number){ return Math.min(Math.max(n, min), max) }

function intersects(a:Rect, b:Rect){
  return !(
    a.left + a.width <= b.left ||
    b.left + b.width <= a.left ||
    a.top + a.height <= b.top ||
    b.top + b.height <= a.top
  )
}

export function computePlacement(params:{
  anchor: Rect,
  panelW: number,
  panelH: number,
  viewport:{ top:number; left:number; width:number; height:number },
  avoid?: Rect[],
  pad?: number,
}): { top:number; left:number }{
  const { anchor, panelW, panelH, viewport } = params
  const avoid = params.avoid || []
  const pad = params.pad ?? 12
  const safeTop = viewport.top + pad
  const safeBottom = viewport.top + viewport.height - pad
  const left = clamp((anchor.left + anchor.width/2) - panelW/2, viewport.left + 12, viewport.left + viewport.width - panelW - 12)
  // Prefer the side with more available space, but fall back if the chosen side
  // doesn't have enough headroom for the panel. This prevents the coachmark from
  // sitting directly on top of the anchor when space below is tight (e.g. tech
  // grid near screen bottom).
  const above = anchor.top - safeTop
  const below = safeBottom - (anchor.top + anchor.height)
  const preferBelow = below >= panelH + 8 || below >= above
  let topCandidate = preferBelow ? (anchor.top + anchor.height + 12) : (anchor.top - panelH - 12)
  if (preferBelow && (topCandidate + panelH > safeBottom)) {
    // Not enough room below; flip above
    topCandidate = anchor.top - panelH - 12
  } else if (!preferBelow && topCandidate < safeTop) {
    // Not enough room above; flip below
    topCandidate = anchor.top + anchor.height + 12
  }
  let top = clamp(topCandidate, safeTop, safeBottom - panelH)

  // Prevent intersecting the anchor
  const panelRect: Rect = { top, left, width: panelW, height: panelH }
  if (intersects(panelRect, anchor)){
    if ((anchor.top - panelH - 16) > safeTop) {
      top = anchor.top - panelH - 16
    } else {
      top = anchor.top + anchor.height + 16
    }
  }

  // Avoid other UI rects if overlapping
  avoid.forEach(ar => {
    const cur = { top, left, width: panelW, height: panelH }
    if (intersects(cur, ar)) {
      const t = ar.top - panelH - 16
      top = clamp(t, safeTop, safeBottom - panelH)
    }
  })

  return { top, left }
}
