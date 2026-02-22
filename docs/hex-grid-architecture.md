# Hex Grid Architecture

## Overview

Interactive hex grid system for Eclipse galaxy map using react-hexgrid library with React 19.

## Components

### GalaxyBoard (`src/components/GalaxyBoard.tsx`)

**Purpose**: Main container for hex grid galaxy map

**Features**:
- Configurable ring count (default: 3 rings = 37 hexes)
- Dual mode: demo mode (auto-generated sectors) or game mode (custom SectorData)
- Click and hover handlers
- Responsive SVG rendering
- Cubic coordinate system (q, r, s)

**Props**:
```typescript
interface GalaxyBoardProps {
  rings?: number;                          // Number of rings around center (default: 3)
  sectors?: SectorData[];                  // Custom sector data (optional)
  onHexClick?: (sectorId: string) => void; // Click handler
  onHexHover?: (sectorId: string | null) => void; // Hover handler
}
```

**Coordinate System**:
- Uses cubic coordinates where q + r + s = 0
- Center hex: (0, 0, 0)
- Ring 1: 6 hexes
- Ring 2: 12 hexes
- Ring 3: 18 hexes
- Total for 3 rings: 37 hexes

**Usage**:
```tsx
// Demo mode (auto-generated)
<GalaxyBoard rings={3} onHexClick={(id) => console.log(id)} />

// Game mode (custom sectors)
<GalaxyBoard
  sectors={mySectors}
  onHexClick={handleExplore}
  onHexHover={showTooltip}
/>
```

### SectorTile (`src/components/SectorTile.tsx`)

**Purpose**: Renders content within a single hex sector

**Features**:
- Planet icons with resource counts
- Ancient ship indicators
- Fleet/ship counts
- Explored vs unexplored states
- Wormhole connections (data structure ready)
- Discovery tiles (data structure ready)

**Data Structure**:
```typescript
interface SectorData {
  id: string;
  coordinates: { q: number; r: number; s: number };
  type: 'center' | 'inner' | 'middle' | 'outer' | 'starting';
  explored: boolean;
  owner?: string; // playerId
  planets?: {
    type: 'terran' | 'ice' | 'desert' | 'gas';
    resources: number;
  }[];
  wormholes?: string[]; // IDs of connected sectors
  hasAncientShip?: boolean;
  hasDiscovery?: boolean;
  ships?: {
    playerId: string;
    count: number;
  }[];
}
```

**Rendering Logic**:
- Unexplored: Shows "?" placeholder
- Center: "Galactic Center" label
- Explored: Planets, resources, ships, threats

**Visual Elements**:
- Planet colors: Terran (green), Ice (blue), Desert (orange), Gas (purple)
- Resource symbol: ⚛
- Ancient ship warning: ⚠
- Ship icon: 🚀

## Integration Points

### Convex Real-time State

Add galaxy state to Convex schema:

```typescript
// convex/schema.ts
galaxyState: defineTable({
  roomId: v.id("rooms"),
  sectors: v.array(v.object({
    id: v.string(),
    coordinates: v.object({ q: v.number(), r: v.number(), s: v.number() }),
    type: v.string(),
    explored: v.boolean(),
    owner: v.optional(v.string()),
    // ... other fields
  })),
}).index("by_room", ["roomId"]),
```

Query example:
```typescript
const galaxyState = useQuery(api.galaxy.getGalaxyForRoom, { roomId });

return <GalaxyBoard sectors={galaxyState?.sectors} />;
```

### Game Flow Integration

**Option A: Add to existing roguelike**
- New phase: Exploration → Outpost → Combat
- Clicking unexplored hex → explore (draw random sector)
- Sector determines combat difficulty/rewards
- Ships move between sectors

**Option B: Standalone Eclipse board game**
- Replace existing flow entirely
- Full Eclipse board game rules
- 54+ sector tiles from board game
- Influence disk placement
- Technology trees
- Combat on sectors

## Performance Characteristics

**react-hexgrid (SVG)**:
- ✅ Perfect scaling at all zoom levels
- ✅ Crisp rendering on high-DPI displays
- ✅ Easy to inspect/debug in DevTools
- ✅ Accessibility support via SVG semantics
- ⚠️ Performance degrades at 100+ hexes
- ⚠️ Each hex = multiple DOM elements

**For Eclipse board game (54 sectors)**: SVG is perfect
**For large generated galaxies (200+ sectors)**: Consider Canvas

## Mobile Responsiveness

Current implementation:
- SVG viewBox for aspect ratio preservation
- Fixed 1200x800 canvas (should be responsive)

TODO:
- Use CSS for responsive sizing
- Add pinch-zoom support
- Optimize touch target sizes (hexes should be large enough)
- Test on mobile devices

## Zoom & Pan

Not yet implemented. Options:

**Option 1: react-zoom-pan-pinch**
```tsx
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

<TransformWrapper>
  <TransformComponent>
    <GalaxyBoard />
  </TransformComponent>
</TransformWrapper>
```

**Option 2: Native SVG pan/zoom**
- Implement viewBox transformation
- Handle mouse wheel / pinch gestures
- More control, more complexity

## Testing

Tests: `src/__tests__/GalaxyBoard.spec.tsx`

Coverage:
- ✅ Renders without crashing
- ✅ Correct hex count for 1, 2, 3 rings
- ✅ Center hex labeled correctly
- ✅ Click handlers
- ⏳ SectorTile rendering (TODO)
- ⏳ Hover states (TODO)
- ⏳ Explored vs unexplored (TODO)

## Next Steps

1. **Clarify requirements**: Roguelike extension vs board game implementation
2. **Convex integration**: Add galaxy state schema and queries
3. **Zoom/Pan**: Add TransformWrapper or custom solution
4. **Mobile**: Make fully responsive
5. **Sector interactions**: Exploration, movement, combat triggers
6. **Visual polish**: Gradients, shadows, animations
7. **Wormhole rendering**: Path component connecting sectors
8. **Discovery tiles**: Overlay rendering
9. **Player colors**: Influence disk rendering

## References

- [react-hexgrid GitHub](https://github.com/Hellenic/react-hexgrid)
- [Eclipse Board Game Rules](https://www.ultraboardgames.com/eclipse/game-rules.php)
- [Hex Grid Coordinate Systems](https://www.redblobgames.com/grids/hexagons/)
