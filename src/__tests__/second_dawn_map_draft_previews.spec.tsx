import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {createGame} from '../../shared/eclipse/setup';
import {getPlayerView,getSpectatorView} from '../../shared/eclipse/protocol';
import type {GameCommand} from '../../shared/eclipse/types';
import GalaxyBoard from '../second-dawn-game/GalaxyBoard';
import SecondDawnBoard from '../second-dawn-game/SecondDawnBoard';
import FactionAbilityControls from '../second-dawn-game/FactionAbilityControls';
import {CommitContext} from '../second-dawn-game/commitContext';
import {emptyActionDrafts,setDraftValue,writeActionDrafts,type DraftValues} from '../second-dawn-game/actionDraftStorage';
import {ActionDraftProvider} from '../second-dawn-game/ActionDraftProvider';
import ActivityDock from '../second-dawn-game/ActivityDock';

afterEach(()=>{cleanup();localStorage.clear();});
function fixture(){const state=createGame({seed:4,seats:[{id:'a',faction:'terran-directorate',controller:'human'},{id:'b',faction:'hydran',controller:'ai'}]});state.activeSeatId='a';return {state,view:getPlayerView(state,'a')!,own:state.sectors.find(s=>s.owner==='a')!,other:state.sectors.find(s=>s.owner===null)!};}
it('shows both sides of a staged influence transfer without replacing public control',()=>{
 const {view,own,other}=fixture(),before=JSON.stringify(view);
 render(<GalaxyBoard view={view} candidates={[]} selected={other.id} plannedInfluence={{type:'influence',removeSectorIds:[own.id],addSectorIds:[other.id]}} onSelect={vi.fn()} onExplore={vi.fn()}/>);
 expect(screen.getByRole('img',{name:`Planned influence disc in sector ${other.tileId}`})).toBeVisible();
 expect(screen.getByRole('img',{name:`Withdraw influence disc from sector ${own.tileId}`})).toBeVisible();
 expect(screen.getByRole('img',{name:'Terran Directorate influence disc'})).toBeInTheDocument();
 expect(JSON.stringify(view)).toBe(before);
});
it('shows staged population on its exact planet and keeps it private from spectators',()=>{
 const {state,view,own}=fixture();own.population=[];const placements=[{sectorId:own.id,squareId:'p0',resource:'money' as const}];
 const {rerender}=render(<GalaxyBoard view={view} candidates={[]} selected={own.id} plannedColonies={placements} onSelect={vi.fn()} onExplore={vi.fn()}/>);
 expect(screen.getByRole('img',{name:`Planned money population on p0 in sector ${own.tileId}`})).toBeVisible();
 rerender(<GalaxyBoard view={getSpectatorView(state)} candidates={[]} selected={own.id} plannedColonies={placements} plannedInfluence={{type:'influence',removeSectorIds:[],addSectorIds:[own.id]}} onSelect={vi.fn()} onExplore={vi.fn()}/>);
 expect(screen.queryByRole('img',{name:/Planned .*population/})).not.toBeInTheDocument();
 expect(screen.queryByRole('img',{name:/Planned influence disc/})).not.toBeInTheDocument();
});
it('restores influence and colony map ghosts from their own saved activities',()=>{
 const {view,own,other}=fixture();const command:GameCommand={type:'influence',removeSectorIds:[own.id],addSectorIds:[other.id]};
 let drafts=emptyActionDrafts({matchId:'ghosts',viewerSeatId:'a'});
 drafts=setDraftValue(drafts,'action','influence',view.revision);drafts=setDraftValue(drafts,'influenceDraft',{command,label:'Transfer',description:''},view.revision);drafts=setDraftValue(drafts,'colonization',{[`${own.id}:p0`]:'money'},view.revision);writeActionDrafts(localStorage,drafts);
 render(<SecondDawnBoard matchId="ghosts" view={view} candidates={[{command,label:'Transfer',description:''}]} connected busy={false} status="" onSubmit={vi.fn()} onMenu={vi.fn()}/>);
 expect(screen.getByRole('img',{name:`Planned influence disc in sector ${other.tileId}`})).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Resume colonize draft'}));
 expect(screen.getByRole('img',{name:`Planned money population on p0 in sector ${own.tileId}`})).toBeInTheDocument();
 expect(screen.queryByRole('img',{name:`Planned influence disc in sector ${other.tileId}`})).not.toBeInTheDocument();
});
it('previews forced colonization on the shared galaxy before resolving it',()=>{
 const {state,own}=fixture();own.population=[];state.pendingDecision={id:'colony',owner:'a',kind:'colonization',squares:[{sectorId:own.id,squareId:'p0',resources:['money']}]};const submit=vi.fn();
 render(<SecondDawnBoard view={getPlayerView(state,'a')!} candidates={[]} connected busy={false} status="" onSubmit={submit} onMenu={vi.fn()}/>);
 fireEvent.click(screen.getByRole('button',{name:`Colonize Money planet p0 in sector ${own.tileId}`}));
 expect(screen.getByRole('img',{name:`Planned money population on p0 in sector ${own.tileId}`})).toBeInTheDocument();
 expect(submit).not.toHaveBeenCalled();
});
it('places factory selection beside its ship and requires an explicit commit',()=>{
 const {view,own}=fixture();view.seats[0].faction='bobiverse';const ship=view.ships.find(s=>s.owner==='a')!;const command:GameCommand={type:'load-factory',shipId:ship.id};const submit=vi.fn();
 render(<SecondDawnBoard initialSectorId={own.id} view={view} candidates={[{command,label:'Load',description:''}]} connected busy={false} status="" onSubmit={submit} onMenu={vi.fn()}/>);
 const inspector=screen.getByRole('complementary',{name:'Selection and action details'});
 fireEvent.click(within(inspector).getByRole('button',{name:/Load factory/}));
 expect(submit).not.toHaveBeenCalled();
 fireEvent.click(within(inspector).getByRole('button',{name:'Load selected factory'}));
 expect(submit).toHaveBeenCalledWith(command);
});
it('offers the same factory preview from a fleet inspection',()=>{
 const {view,own}=fixture();view.seats[0].faction='bobiverse';const ship=view.ships.find(s=>s.owner==='a')!,submit=vi.fn();
 render(<SecondDawnBoard initialSectorId={own.id} view={view} candidates={[{command:{type:'load-factory',shipId:ship.id},label:'Load',description:''}]} connected busy={false} status="" onSubmit={submit} onMenu={vi.fn()}/>);
 fireEvent.click(within(screen.getByRole('group',{name:'Galaxy map'})).getByRole('button',{name:'Replicant Commonwealth: 1 Interceptor'}));
 const dialog=screen.getByRole('dialog',{name:/Fleet inspection/});
 fireEvent.click(within(dialog).getByRole('button',{name:/Load factory/}));expect(submit).not.toHaveBeenCalled();
 expect(within(dialog).getByRole('button',{name:'Load selected factory'})).toBeEnabled();
});
it('blocks unsupported off-turn faction actions with a local reason',()=>{
 const {view}=fixture();view.seats[0].faction='bobiverse';const ship=view.ships.find(s=>s.owner==='a')!,submit=vi.fn();
 render(<CommitContext.Provider value><FactionAbilityControls view={view} candidates={[{command:{type:'load-factory',shipId:ship.id},label:'Load',description:''}]} disabled={false} onSubmit={submit} onAction={vi.fn()}/></CommitContext.Provider>);
 fireEvent.click(screen.getByRole('button',{name:/Load factory/}));
 expect(screen.getByText('Loading a factory cannot be queued. Use this ability during your turn.')).toBeVisible();
 fireEvent.click(screen.getByRole('button',{name:/Load selected factory/}));
 expect(submit).not.toHaveBeenCalled();
});
it.each<{command:NonNullable<DraftValues['factionDraft']>;reason:string;button:string}>([
 {command:{type:'place-guild-portal',sectorId:'221'},reason:'Placing a portal',button:'Place selected portal'},
 {command:{type:'reverse-engineer',track:'military'},reason:'Completing a reverse-engineering project',button:'Complete selected project'},
 {command:{type:'buy-activation',action:'research'},reason:'Buying an extra activation',button:'Buy extra Research activation'},
])('blocks queued $command.type drafts without losing the selected object',({command,reason,button})=>{
 const {view}=fixture(),submit=vi.fn();let drafts=emptyActionDrafts({matchId:'unsupported',viewerSeatId:'a'});drafts=setDraftValue(drafts,'factionDraft',command,view.revision);writeActionDrafts(localStorage,drafts);
 render(<ActionDraftProvider matchId="unsupported" viewerSeatId="a" revision={view.revision}><CommitContext.Provider value><FactionAbilityControls view={view} candidates={[{command,label:'Ability',description:''}]} disabled={false} onSubmit={submit} onAction={vi.fn()}/></CommitContext.Provider></ActionDraftProvider>);
 expect(screen.getByText(`${reason} cannot be queued. Use this ability during your turn.`)).toBeVisible();
 expect(screen.getByRole('button',{name:`Queue for my turn · ${button}`})).toBeDisabled();
 expect(submit).not.toHaveBeenCalled();
});
it('offers distinct resume and local reset for supporting drafts',()=>{
 let drafts=emptyActionDrafts({matchId:'supporting',viewerSeatId:'a'});
 drafts=setDraftValue(drafts,'diplomacyPartner','b',1);drafts=setDraftValue(drafts,'minorSpeciesSelection','researchers',1);drafts=setDraftValue(drafts,'guildAmount',4,1);drafts=setDraftValue(drafts,'factionDraft',{type:'convert-colony-ship',resource:'science'},1);writeActionDrafts(localStorage,drafts);
 const resume=vi.fn();render(<ActionDraftProvider matchId="supporting" viewerSeatId="a" revision={1}><ActivityDock current="guild-trade" disabled={false} onResume={resume}/></ActionDraftProvider>);
 fireEvent.click(screen.getByRole('button',{name:'Resume diplomacy draft'}));expect(resume).toHaveBeenCalledWith('offer-diplomacy');
 expect(screen.getByRole('button',{name:'Resume recruitment draft'})).toBeVisible();
 expect(screen.getByRole('button',{name:'Resume faction draft'})).toBeVisible();
 fireEvent.click(screen.getByRole('button',{name:'Reset Guild exchange draft'}));
 expect(screen.queryByRole('button',{name:'Resume Guild exchange draft'})).not.toBeInTheDocument();
 expect(screen.getByRole('button',{name:'Resume faction draft'})).toBeVisible();
});
it('keeps a removed faction object visible as an invalid draft',()=>{
 const {view}=fixture();let drafts=emptyActionDrafts({matchId:'missing-factory',viewerSeatId:'a'});drafts=setDraftValue(drafts,'factionDraft',{type:'load-factory',shipId:'destroyed-ship'},view.revision);writeActionDrafts(localStorage,drafts);
 render(<ActionDraftProvider matchId="missing-factory" viewerSeatId="a" revision={view.revision}><FactionAbilityControls objectActions={false} view={view} candidates={[]} disabled={false} onSubmit={vi.fn()} onAction={vi.fn()}/></ActionDraftProvider>);
 expect(screen.getByRole('status')).toHaveTextContent('This ability is no longer available for the selected object.');
 expect(screen.getByRole('button',{name:'Load selected factory'})).toBeDisabled();
});
it('resumes a faction draft without exposing a saved exploration commit',()=>{
 const {view,own}=fixture();view.seats[0].faction='bobiverse';const ship=view.ships.find(s=>s.owner==='a')!;
 const explore={command:{type:'explore' as const,position:{q:5,r:0}},label:'Explore',description:''};
 let drafts=emptyActionDrafts({matchId:'faction-resume',viewerSeatId:'a'});drafts=setDraftValue(drafts,'exploreDraft',explore,view.revision);drafts=setDraftValue(drafts,'factionDraft',{type:'load-factory',shipId:ship.id},view.revision);writeActionDrafts(localStorage,drafts);
 render(<SecondDawnBoard matchId="faction-resume" initialSectorId={own.id} view={view} candidates={[explore,{command:{type:'load-factory',shipId:ship.id},label:'Load',description:''}]} connected busy={false} status="" onSubmit={vi.fn()} onMenu={vi.fn()}/>);
 fireEvent.click(screen.getByRole('button',{name:'Resume faction draft'}));
 expect(screen.getByRole('button',{name:'Load selected factory'})).toBeEnabled();
 expect(screen.queryByRole('button',{name:'Explore · 1 influence disc'})).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Resume explore draft'}));
 expect(screen.getByRole('button',{name:'Explore · 1 influence disc'})).toBeEnabled();
});
