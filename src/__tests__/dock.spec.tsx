import { describe, it, expect } from 'vitest';

import { render, screen, fireEvent } from '@testing-library/react';
import { DockSlots } from '../components/ui';
import OutpostPage from '../pages/OutpostPage';
import { makeShip, getFrame, PARTS } from '../game';
import type { ResearchState as Research, GhostDelta, Ship } from '../config/types';

// React import not required

describe('dock and upgrade visuals', () => {
  it('renders filled and empty dock slots', () => {
    render(<DockSlots used={2} cap={4} />);
    expect(screen.getAllByTestId('dock-slot-filled')).toHaveLength(2);
    expect(screen.getAllByTestId('dock-slot-empty')).toHaveLength(2);
  });

  it('previews and shows overflow slots', () => {
    render(<DockSlots used={2} cap={4} preview={5} />);
    expect(screen.getAllByTestId('dock-slot-filled')).toHaveLength(2);
    expect(screen.getAllByTestId('dock-slot-preview')).toHaveLength(2);
    expect(screen.getAllByTestId('dock-slot-over')).toHaveLength(1);
  });

  it('shows slot increase and dock icon in upgrade and build buttons', () => {
    const ship: Ship = makeShip(getFrame('interceptor'), [PARTS.sources[0], PARTS.drives[0]]);
    render(
      <OutpostPage
        resources={{credits:100, materials:100, science:0}}
        rerollCost={0}
        doReroll={()=>{}}
        research={{Military:2, Grid:1, Nano:1} as Research}
        researchLabel={(t)=>t}
        canResearch={()=>false}
        researchTrack={()=>{}}
        fleet={[ship]}
        focused={0}
        setFocused={()=>{}}
        buildShip={()=>{}}
        upgradeShip={()=>{}}
        upgradeDock={()=>{}}
        upgradeLockInfo={()=>({need:2, next:'Cruiser'})}
        blueprints={{interceptor:[], cruiser:[], dread:[]}}
        sellPart={()=>{}}
        shop={{items:[]}}
        ghost={(): GhostDelta => ({
          targetName: 'X',
          use: 0,
          prod: 0,
          valid: true,
          slotsUsed: 0,
          slotCap: 0,
          slotOk: true,
          initBefore: 0,
          initAfter: 0,
          initDelta: 0,
          hullBefore: 0,
          hullAfter: 0,
          hullDelta: 0,
        })}
        buyAndInstall={()=>{}}
        capacity={{cap:6}}
        tonnage={{used:1, cap:6}}
        sector={1}
        endless={false}
        fleetValid={true}
        startCombat={()=>{}}
        onRestart={()=>{}}
      />
    );
    const slotText = screen.getByText(/⬛ 6→8 slots/);
    expect(slotText).toBeInTheDocument();
    const upgradeBtn = screen.getByRole('button', {name:/Upgrade Interceptor to Cruiser/});
    expect(upgradeBtn).toHaveTextContent('⬛ 6→8');
    expect(upgradeBtn).toHaveTextContent('🟢');
    const buildBtn = screen.getByRole('button', {name:/Build Interceptor/});
    expect(buildBtn).toHaveTextContent('🟢');
    fireEvent.mouseEnter(upgradeBtn);
    expect(screen.getAllByTestId('dock-slot-preview').length).toBeGreaterThan(0);
  });

  it('disables upgrade button when tech too low', () => {
    const ship: Ship = makeShip(getFrame('interceptor'), [PARTS.sources[0], PARTS.drives[0]]);
    render(
      <OutpostPage
        resources={{credits:100, materials:100, science:0}}
        rerollCost={0}
        doReroll={()=>{}}
        research={{Military:1, Grid:1, Nano:1} as Research}
        researchLabel={(t)=>t}
        canResearch={()=>false}
        researchTrack={()=>{}}
        fleet={[ship]}
        focused={0}
        setFocused={()=>{}}
        buildShip={()=>{}}
        upgradeShip={()=>{}}
        upgradeDock={()=>{}}
        upgradeLockInfo={()=>({need:2, next:'Cruiser'})}
        blueprints={{interceptor:[], cruiser:[], dread:[]}}
        sellPart={()=>{}}
        shop={{items:[]}}
        ghost={(): GhostDelta => ({
          targetName: 'X',
          use: 0,
          prod: 0,
          valid: true,
          slotsUsed: 0,
          slotCap: 0,
          slotOk: true,
          initBefore: 0,
          initAfter: 0,
          initDelta: 0,
          hullBefore: 0,
          hullAfter: 0,
          hullDelta: 0,
        })}
        buyAndInstall={()=>{}}
        capacity={{cap:6}}
        tonnage={{used:1, cap:6}}
        sector={1}
        endless={false}
        fleetValid={true}
        startCombat={()=>{}}
        onRestart={()=>{}}
      />
    );
    const upgradeBtn = screen.getByRole('button', {name:/Requires Military ≥ 2/});
    expect(upgradeBtn).toBeDisabled();
  });

  it('disables build button when unaffordable', () => {
    const ship = makeShip(getFrame('interceptor'), [PARTS.sources[0], PARTS.drives[0]]);
    render(
      <OutpostPage
        resources={{credits:0, materials:0, science:0}}
        rerollCost={0}
        doReroll={()=>{}}
        research={{Military:2, Grid:1, Nano:1} as Research}
        researchLabel={(t)=>t}
        canResearch={()=>false}
        researchTrack={()=>{}}
        fleet={[ship]}
        focused={0}
        setFocused={()=>{}}
        buildShip={()=>{}}
        upgradeShip={()=>{}}
        upgradeDock={()=>{}}
        upgradeLockInfo={()=>({need:2, next:'Cruiser'})}
        blueprints={{interceptor:[], cruiser:[], dread:[]}}
        sellPart={()=>{}}
        shop={{items:[]}}
        ghost={(): GhostDelta => ({
          targetName: 'X',
          use: 0,
          prod: 0,
          valid: true,
          slotsUsed: 0,
          slotCap: 0,
          slotOk: true,
          initBefore: 0,
          initAfter: 0,
          initDelta: 0,
          hullBefore: 0,
          hullAfter: 0,
          hullDelta: 0,
        })}
        buyAndInstall={()=>{}}
        capacity={{cap:6}}
        tonnage={{used:1, cap:6}}
        sector={1}
        endless={false}
        fleetValid={true}
        startCombat={()=>{}}
        onRestart={()=>{}}
      />
    );
    const buildBtn = screen.getByRole('button', {name:/Build Interceptor/});
    expect(buildBtn).toBeDisabled();
  });

  it('offers restart when fleet invalid and broke', () => {
    const ship: Ship = makeShip(getFrame('interceptor'), []);
    render(
      <OutpostPage
        resources={{credits:0, materials:0, science:0}}
        rerollCost={0}
        doReroll={()=>{}}
        research={{Military:1, Grid:1, Nano:1} as Research}
        researchLabel={(t)=>t}
        canResearch={()=>false}
        researchTrack={()=>{}}
        fleet={[ship]}
        focused={0}
        setFocused={()=>{}}
        buildShip={()=>{}}
        upgradeShip={()=>{}}
        upgradeDock={()=>{}}
        upgradeLockInfo={()=>null}
        blueprints={{interceptor:[], cruiser:[], dread:[]}}
        sellPart={()=>{}}
        shop={{items:[]}}
        ghost={(): GhostDelta => ({
          targetName: 'X',
          use: 0,
          prod: 0,
          valid: true,
          slotsUsed: 0,
          slotCap: 0,
          slotOk: true,
          initBefore: 0,
          initAfter: 0,
          initDelta: 0,
          hullBefore: 0,
          hullAfter: 0,
          hullDelta: 0,
        })}
        buyAndInstall={()=>{}}
        capacity={{cap:6}}
        tonnage={{used:1, cap:6}}
        sector={1}
        endless={false}
        fleetValid={false}
        startCombat={()=>{}}
        onRestart={()=>{}}
      />
    );
    expect(screen.getByText('Fleet inoperable and no credits')).toBeInTheDocument();
    expect(screen.getByRole('button', {name:'Restart'})).toBeInTheDocument();
  });
});
