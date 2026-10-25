// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createGame } from '../../shared/eclipse/setup';
import { queueAncientPart } from '../../shared/eclipse/ancientAcquisition';
import { presentNextDecision } from '../../shared/eclipse/rulesState';
import { getPlayerView } from '../../shared/eclipse/protocol';
import { legalCommands } from '../../shared/eclipse/legal';
import AncientPartDecision from '../second-dawn-game/AncientPartDecision';
afterEach(cleanup);
function props(part='ion-disruptor'){const s=createGame({seed:9,warpPortals:false,seats:[{id:'a',faction:'hydran',controller:'human'},{id:'b',faction:'planta',controller:'ai'}]});queueAncientPart(s,s.seats[0],part);presentNextDecision(s);const view=getPlayerView(s,'a');if(view.pendingDecision?.kind!=='ancient-part')throw new Error('Expected ancient part');return {view,decision:view.pendingDecision,candidates:legalCommands(view),disabled:false,onSubmit:vi.fn()};}
it('shows the existing component and the exact replacement before installing a legal candidate',()=>{const p=props();render(<AncientPartDecision {...p}/>);fireEvent.click(screen.getByRole('button',{name:'Slot 1: Ion Cannon'}));expect(screen.getByText('Ion Cannon → Ion Disruptor')).toBeTruthy();expect(screen.getByRole('button',{name:'Slot 1: Ion Disruptor'})).toHaveAttribute('aria-pressed','true');expect(p.onSubmit).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Install free'}));const c=p.onSubmit.mock.calls[0][0];expect(p.candidates.some(candidate=>JSON.stringify(candidate.command)===JSON.stringify(c))).toBe(true);expect(c.choice.blueprint.parts[0]).toBe('ion-disruptor');});
it('switches ship class and displays that class current parts',()=>{const p=props();render(<AncientPartDecision {...p}/>);fireEvent.click(screen.getByRole('button',{name:'Cruiser'}));expect(screen.getByRole('button',{name:'Slot 1: Electron Computer'})).toBeTruthy();expect(screen.getByRole('img',{name:'Cruiser blueprint silhouette'})).toBeTruthy();});
it('does not offer unsafe placements absent from legal candidates and allows storage',()=>{const p=props('plasma-turret');render(<AncientPartDecision {...p}/>);expect(screen.getByRole('button',{name:'Slot 1: Ion Cannon'})).toBeDisabled();fireEvent.click(screen.getByRole('button',{name:'Store for later'}));fireEvent.click(screen.getByRole('button',{name:'Store'}));expect(p.onSubmit).toHaveBeenCalledWith({type:'resolve',decisionId:p.decision.id,choice:{kind:'ancient-part',blueprint:null}});});
it('places Muon Source outside the grid without replacing a component',()=>{const p=props('muon-source');render(<AncientPartDecision {...p}/>);fireEvent.click(screen.getByRole('button',{name:'Install outside the grid'}));expect(screen.getByText(/No component replaced.*permanent/)).toBeTruthy();fireEvent.click(screen.getByRole('button',{name:'Install free'}));expect(p.onSubmit.mock.calls[0][0].choice.blueprint.outsideParts).toContain('muon-source');});
it('retains a class placement while comparing another class and commits only the current preview',()=>{
 const p=props();render(<AncientPartDecision {...p}/>);
 fireEvent.click(screen.getByRole('button',{name:'Slot 1: Ion Cannon'}));
 fireEvent.click(screen.getByRole('button',{name:'Cruiser'}));
 expect(screen.getByRole('button',{name:'Install free'})).toBeDisabled();
 fireEvent.click(screen.getByRole('button',{name:'Slot 2: Ion Cannon'}));
 fireEvent.click(screen.getByRole('button',{name:'Interceptor'}));
 expect(screen.getByRole('button',{name:'Slot 1: Ion Disruptor'})).toHaveAttribute('aria-pressed','true');
 fireEvent.click(screen.getByRole('button',{name:'Install free'}));
 expect(p.onSubmit.mock.calls[0][0].choice.blueprint.shipType).toBe('interceptor');
});
it('does not change the selected destination when legal candidate order changes',()=>{
 const p=props();const ui=render(<AncientPartDecision {...p}/>);
 fireEvent.click(screen.getByRole('button',{name:'Slot 1: Ion Cannon'}));
 ui.rerender(<AncientPartDecision {...p} candidates={[...p.candidates].reverse()}/>);
 fireEvent.click(screen.getByRole('button',{name:'Install free'}));
 expect(p.onSubmit.mock.calls[0][0].choice.blueprint.parts[0]).toBe('ion-disruptor');
});
