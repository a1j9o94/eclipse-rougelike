# Galaxy Map Demo

## Quick Start

To view the interactive galaxy map demo:

```bash
npm run dev
```

Then open `http://localhost:5173/galaxy-demo.html`

## Features Demonstrated

1. **Ring Configuration**: Slider to change galaxy size (1-5 rings)
   - 1 ring = 7 hexes
   - 2 rings = 19 hexes
   - 3 rings = 37 hexes (default)
   - 4 rings = 61 hexes
   - 5 rings = 91 hexes

2. **Demo Mode** (unchecked): Auto-generated sectors
   - Every 3rd hex has a planet
   - Hex at index 7 has an ancient ship
   - Shows coordinates

3. **Custom Sector Mode** (checked): Hand-crafted sectors
   - Mix of explored and unexplored
   - Planets of different types (terran, ice, desert, gas)
   - Resource counts
   - Ancient ships (dangerous!)
   - Player ships
   - Discovery tiles

4. **Interactions**:
   - Click any hex → shows in "Selected" field
   - Hover over hex → shows in "Hovering" field
   - Hexes change color on hover

## Component Structure

```
GalaxyBoard
├─ HexGrid (react-hexgrid)
│  └─ Layout (cubic coordinates)
│     └─ Hexagon (for each sector)
│        └─ SectorTile (custom content)
│           ├─ Planets (circles with colors)
│           ├─ Resources (⚛ count)
│           ├─ Ancient Ships (⚠ warning)
│           └─ Player Ships (🚀 count)
```

## Testing

Run tests:
```bash
npm run test -- src/__tests__/GalaxyBoard.spec.tsx
```

All 7 tests should pass.

## Next Steps

This demo is ready for:
1. Integration into main game flow
2. Convex real-time multiplayer sync
3. Zoom/pan controls
4. Mobile optimization
5. Game logic (exploration, movement, combat)
