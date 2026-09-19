import type { FactionId } from '../../shared/eclipse/catalog';
import type { Ship } from '../../shared/eclipse/types';
import { shipDesignFamily } from './factionShipDesigns';

/** Original alpha-bearing sheets are cropped by SVG, retaining the source pixels. */
export function AtlasFigurine({ type, faction, label, className }: {
  type: Ship['type']; faction?: FactionId; label: string; className: string;
}) {
  const neutral = type === 'ancient' || type === 'guardian' || type === 'gcds';
  const family = faction ? shipDesignFamily(faction) : undefined;
  const row = neutral ? 2 : family === 'planta' || family === 'draco' ? 1 : 0;
  const column = type === 'interceptor' || type === 'ancient' ? 0 : type === 'cruiser' || type === 'guardian' ? 1 : type === 'dreadnought' ? 2 : 3;
  return <svg className={`${className} atlas-figurine`} viewBox="0 0 384 336" role="img" aria-label={label} data-atlas-figurine={type} data-ship-family={family}>
    <foreignObject width="384" height="336" pointerEvents="none"><div data-atlas-art="figurine" style={{width:384,height:336,backgroundImage:'url(/second-dawn/atlas/ship-figurines.png)',backgroundSize:'1536px 1024px',backgroundPosition:`-${column * 384}px -${row * 336}px`}}/></foreignObject>
  </svg>;
}

/** Tile relief is decorative; no exits, population, units or counts are baked in. */
export function AtlasSectorRelief({ central, tileId }: { central: boolean; tileId: string }) {
  const index = central ? 5 : [0, 1, 3][Number(tileId) % 3];
  const column = index % 3, row = Math.floor(index / 3);
  return <svg x="-50" y="-58" width="100" height="116" viewBox="0 0 426 484" preserveAspectRatio="none" className="atlas-sector-relief" aria-hidden="true" pointerEvents="none">
    <foreignObject width="426" height="484"><div style={{width:426,height:484,backgroundImage:'url(/second-dawn/atlas/sector-tiles.png)',backgroundSize:'1536px 1024px',backgroundPosition:`-${55 + column * 500}px -${16 + row * 495}px`}}/></foreignObject>
  </svg>;
}
