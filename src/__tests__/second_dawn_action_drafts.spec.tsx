import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ActionDraftProvider } from '../second-dawn-game/ActionDraftProvider';
import { useActionDraftGuard, useActionDraftState } from '../second-dawn-game/actionDraftContext';
import { draftStorageKey, readActionDrafts } from '../second-dawn-game/actionDraftStorage';
import BuildPlanner from '../second-dawn-game/BuildPlanner';
import BlueprintEditor from '../second-dawn-game/BlueprintEditor';
import MovementPlanner from '../second-dawn-game/MovementPlanner';
import { createGame } from '../../shared/eclipse/setup';
import { getPlayerView } from '../../shared/eclipse/protocol';
import { initialBlueprints } from '../../shared/eclipse/blueprints';
import ActionDraftNotice from '../second-dawn-game/ActionDraftNotice';
afterEach(() => { cleanup(); localStorage.clear(); });
function Harness({ submit = () => {} }: { submit?: () => void }) {
  const [amount, setAmount] = useActionDraftState('tradeAmount', 1);
  const [sector, setSector] = useActionDraftState('selectedSector', null);
  const guard = useActionDraftGuard();
  return <><output aria-label="Amount">{amount}</output><output aria-label="Sector">{sector}</output><span>{guard.stale ? 'Review required' : 'Ready'}</span><button onClick={() => setAmount(value => value + 1)}>Increase</button><button onClick={() => setSector('new-sector')}>Navigate</button><button disabled={guard.stale} onClick={() => { guard.markSubmitted({ type: 'trade', from: 'money', to: 'science', amount }); submit(); }}>Submit</button></>;
}
describe('partitioned local action drafts', () => {
  it('restores a build after refresh without adding a draft-review confirmation', () => {
    const state=createGame({seed:4,seats:[{id:'a',faction:'terran-directorate',controller:'human'},{id:'b',faction:'hydran',controller:'ai'}]});state.activeSeatId='a';state.seats[0].resources.materials=20;
    const view=getPlayerView(state,'a')!;const sectorId=view.sectors.find(sector=>sector.owner==='a')!.id;const submit=vi.fn();
    const planner=<BuildPlanner view={view} sectorId={sectorId} disabled={false} onSubmit={submit} onClose={()=>{}}/>;
    let ui=render(<ActionDraftProvider matchId="build-match" viewerSeatId="a" revision={0}>{planner}</ActionDraftProvider>);
    fireEvent.click(screen.getByRole('button',{name:'Add cruiser'}));fireEvent.click(screen.getByRole('button',{name:/Place cruiser in sector/}));ui.unmount();
    ui=render(<ActionDraftProvider matchId="build-match" viewerSeatId="a" revision={1}>{planner}</ActionDraftProvider>);
    expect(screen.queryByRole('button',{name:'I’ve reviewed my draft'})).toBeNull();
    expect(screen.getByRole('button',{name:/Build 1 ship/})).toBeEnabled();expect(submit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button',{name:/Build 1 ship/}));expect(submit.mock.calls[0][0]).toMatchObject({type:'build',builds:[{component:'cruiser',sectorId}]});ui.unmount();
  });
  it('restores a blueprint and selected hardpoint after refresh without installing automatically', () => {
    const submit=vi.fn();const editor=<BlueprintEditor faction="terran-directorate" blueprint={initialBlueprints('terran-directorate')[0]} technologies={[]} storedParts={[]} capacity={2} disabled={false} onSubmit={submit}/>;
    const ui=render(<ActionDraftProvider matchId="blueprint-match" viewerSeatId="a" revision={0}>{editor}</ActionDraftProvider>);
    fireEvent.click(screen.getByRole('button',{name:'Slot 4: Empty slot'}));fireEvent.click(screen.getByRole('button',{name:'Install Hull in slot 4'}));ui.unmount();
    render(<ActionDraftProvider matchId="blueprint-match" viewerSeatId="a" revision={0}>{editor}</ActionDraftProvider>);
    expect(screen.getByRole('button',{name:'Slot 4: Hull'})).toHaveAttribute('aria-pressed','true');expect(submit).not.toHaveBeenCalled();
  });
  it('restores selected movement ships and recomputes destinations from the current view', () => {
    const state=createGame({seed:4,warpPortals:true,seats:[{id:'a',faction:'terran-directorate',controller:'human'},{id:'b',faction:'hydran',controller:'ai'}]});state.activeSeatId='a';const source=state.sectors.find(sector=>sector.owner==='a')!;const target=state.sectors.find(sector=>sector.owner==='b')!;source.portalVp=1;target.portalVp=1;
    const props={view:getPlayerView(state,'a')!,sourceSectorId:source.id,selectedTargetId:target.id,disabled:false,onTargetsChange:vi.fn(),onClose:vi.fn(),onSubmit:vi.fn()};
    const ui=render(<ActionDraftProvider matchId="move-match" viewerSeatId="a" revision={0}><MovementPlanner {...props}/></ActionDraftProvider>);
    fireEvent.click(screen.getByRole('checkbox',{name:'Interceptor 1'}));ui.unmount();
    render(<ActionDraftProvider matchId="move-match" viewerSeatId="a" revision={0}><MovementPlanner {...props}/></ActionDraftProvider>);
    expect(screen.getByRole('checkbox',{name:'Interceptor 1'})).toBeChecked();expect(screen.getByRole('button',{name:/Confirm move/})).toBeEnabled();expect(props.onSubmit).not.toHaveBeenCalled();
  });
  it('restores typed choices after refresh without submitting and separates seats and matches', () => {
    const submit = vi.fn();
    let ui = render(<ActionDraftProvider matchId="match-a" viewerSeatId="seat-a" revision={4}><Harness submit={submit}/></ActionDraftProvider>);
    fireEvent.click(screen.getByText('Increase'));fireEvent.click(screen.getByText('Navigate'));ui.unmount();
    ui = render(<ActionDraftProvider matchId="match-a" viewerSeatId="seat-a" revision={4}><Harness submit={submit}/></ActionDraftProvider>);
    expect(screen.getByLabelText('Amount')).toHaveTextContent('2');expect(screen.getByLabelText('Sector')).toHaveTextContent('new-sector');expect(submit).not.toHaveBeenCalled();ui.unmount();
    ui = render(<ActionDraftProvider matchId="match-a" viewerSeatId="seat-b" revision={4}><Harness/></ActionDraftProvider>);
    expect(screen.getByLabelText('Amount')).toHaveTextContent('1');ui.unmount();
    render(<ActionDraftProvider matchId="match-b" viewerSeatId="seat-a" revision={4}><Harness/></ActionDraftProvider>);
    expect(screen.getByLabelText('Amount')).toHaveTextContent('1');
  });
  it('retains drafts on unrelated revisions without review and clears only an explicitly accepted matching draft', () => {
    const submit = vi.fn();
    const ui = render(<ActionDraftProvider matchId="match-a" viewerSeatId="seat-a" revision={4}><Harness submit={submit}/></ActionDraftProvider>);
    fireEvent.click(screen.getByText('Increase'));fireEvent.click(screen.getByText('Navigate'));
    ui.rerender(<ActionDraftProvider matchId="match-a" viewerSeatId="seat-a" revision={5}><Harness submit={submit}/></ActionDraftProvider>);
    expect(screen.getByText('Ready')).toBeInTheDocument();expect(screen.getByText('Submit')).toBeEnabled();expect(screen.getByLabelText('Amount')).toHaveTextContent('2');
    fireEvent.click(screen.getByText('Submit'));expect(submit).toHaveBeenCalledTimes(1);
    ui.rerender(<ActionDraftProvider matchId="match-a" viewerSeatId="seat-a" revision={6} lastAcceptedCommand={{revision:6,type:'trade'}}><Harness submit={submit}/></ActionDraftProvider>);
    expect(screen.getByLabelText('Amount')).toHaveTextContent('1');expect(screen.getByLabelText('Sector')).toHaveTextContent('new-sector');
  });
  it('ignores malformed storage and rejects secret-bearing or extra payload fields', () => {
    const partition = { matchId: 'match-a', viewerSeatId: 'seat-a' };
    const key = draftStorageKey(partition);
    localStorage.setItem(key, '{bad json');expect(readActionDrafts(localStorage, partition).values).toEqual({});
    localStorage.setItem(key, JSON.stringify({ version: 1, ...partition, values: { tradeAmount: { revision: 4, value: -2 }, commandDraft: { revision: 4, value: { label: 'Secret', description: '', command: { type: 'resolve', decisionId: 'secret-choice', choice: { kind: 'reputation', kept: [4] } } } }, pin: { revision: 4, value: '123456' } } }));
    expect(readActionDrafts(localStorage, partition).values).toEqual({});
  });
  it('keeps ordinary local component behavior when no provider is installed', () => {
    render(<Harness/>);fireEvent.click(screen.getByText('Increase'));expect(screen.getByLabelText('Amount')).toHaveTextContent('2');expect(localStorage.length).toBe(0);
  });
  it('clears a retried submission only when a fresh accepted duplicate receipt arrives, even behind the current revision', () => {
    const oldReceipt={revision:5,type:'trade' as const};
    const ui=render(<ActionDraftProvider matchId="duplicate-match" viewerSeatId="a" revision={8} lastAcceptedCommand={oldReceipt}><Harness/></ActionDraftProvider>);
    fireEvent.click(screen.getByText('Increase'));fireEvent.click(screen.getByText('Submit'));
    ui.rerender(<ActionDraftProvider matchId="duplicate-match" viewerSeatId="a" revision={9} lastAcceptedCommand={oldReceipt}><Harness/></ActionDraftProvider>);
    expect(screen.getByLabelText('Amount')).toHaveTextContent('2');
    ui.rerender(<ActionDraftProvider matchId="duplicate-match" viewerSeatId="a" revision={9} lastAcceptedCommand={{revision:5,type:'trade'}}><Harness/></ActionDraftProvider>);
    expect(screen.getByLabelText('Amount')).toHaveTextContent('1');
  });
  it('preserves restored choices when browser storage becomes unavailable without a review gate', () => {
    const ui=render(<ActionDraftProvider matchId="quota-match" viewerSeatId="a" revision={0}><Harness/></ActionDraftProvider>);
    fireEvent.click(screen.getByText('Increase'));ui.unmount();
    const blocked=vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw new Error('Quota exceeded');});
    try{
      render(<ActionDraftProvider matchId="quota-match" viewerSeatId="a" revision={1}><Harness/><ActionDraftNotice/></ActionDraftProvider>);
      expect(screen.getByText(/Browser storage is unavailable/)).toBeInTheDocument();
      expect(screen.queryByRole('button',{name:'I’ve reviewed my draft'})).toBeNull();
      expect(screen.getByText('Submit')).toBeEnabled();
    }finally{blocked.mockRestore();}
  });
});
