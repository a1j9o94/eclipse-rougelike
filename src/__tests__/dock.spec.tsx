import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DockSlots } from '../components/ui';
import OutpostPage from '../pages/OutpostPage';
import { makeShip, getFrame, PARTS } from '../game';

// React import not required

describe('dock and upgrade visuals', () => {
  it('renders filled and empty dock slots', () => {
    render(<DockSlots used={2} cap={4} />);
    expect(screen.getAllByTestId('dock-slot-filled')).toHaveLength(2);
    expect(screen.getAllByTestId('dock-slot-empty')).toHaveLength(2);
  });

  it('shows slot increase in upgrade note and button', () => {
    const ship = makeShip(getFrame('interceptor'), [PARTS.sources[0], PARTS.drives[0]]);
    render(
      <OutpostPage
        resources={{credits:0, materials:0, science:0}}
        rerollCost={0}
        doReroll={()=>{}}
        research={{Military:1, Grid:1, Nano:1} as any}
        researchLabel={(t)=>t}
        canResearch={()=>false}
        researchTrack={()=>{}}
        fleet={[ship] as any}
        focused={0}
        setFocused={()=>{}}
        buildShip={()=>{}}
        upgradeShip={()=>{}}
        upgradeDock={()=>{}}
        upgradeLockInfo={()=>null}
        blueprints={{interceptor:[], cruiser:[], dread:[]}}
        sellPart={()=>{}}
        shop={{items:[]}}
        ghost={()=>({} as any)}
        buyAndInstall={()=>{}}
        capacity={{cap:6}}
        tonnage={{used:1, cap:6}}
        fleetValid={true}
        startCombat={()=>{}}
      />
    );
    const slotTexts = screen.getAllByText(/⬛ 6→8 slots/);
    expect(slotTexts.length).toBeGreaterThan(1);
    expect(screen.getByRole('button', {name:/Upgrade Interceptor to Cruiser/})).toHaveTextContent('⬛ 6→8');
  });
});
