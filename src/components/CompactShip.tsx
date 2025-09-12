// React import not required with modern JSX transform

import type { Ship } from '../../shared/types';
import { ShipFrameSlots } from './ShipFrameSlots';

export function CompactShip({ ship, side, active, bounceMs }:{ ship: Ship, side:'P'|'E', active: boolean, bounceMs?: number }){
  const dead = !ship.alive || ship.hull<=0;
  const style = active && typeof bounceMs === 'number' && bounceMs > 0
    ? ({ ['--fire-bounce-ms' as unknown as 'color']: `${bounceMs}ms` } as React.CSSProperties)
    : undefined;
  return (
    <div
      data-ship
      data-testid={active ? 'ship-active' : undefined}
      className={`relative inline-block ${active ? (side==='P' ? 'fire-bounce-up' : 'fire-bounce-down') : ''}`}
      style={style}
      title={ship.frame.name}
    >
      <ShipFrameSlots ship={ship} side={side} active={active} />
      {dead && <div className="absolute inset-0 grid place-items-center text-2xl text-zinc-300">✖</div>}
    </div>
  );
}
