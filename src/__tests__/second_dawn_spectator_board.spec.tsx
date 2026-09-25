import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {createGame} from '../../shared/eclipse/setup';
import {getSpectatorView} from '../../shared/eclipse/protocol';
import type {PublicHistoryEntry} from '../../shared/eclipse/history';
import {galaxyPoint} from '../second-dawn-game/galaxyGeometry';
import SpectatorBoard from '../second-dawn-game/SpectatorBoard';
afterEach(cleanup);
function fixture(){return getSpectatorView(createGame({seed:42,seats:[{id:'a',faction:'terran-directorate',controller:'human'},{id:'b',faction:'hydran',controller:'ai'}]}));}
function feed(entries:PublicHistoryEntry[]=[]){return {entries,loading:false,hasOlder:false,loadingOlder:false,error:null,loadOlder:vi.fn()};}
const callbacks={onHome:vi.fn(),onRoom:vi.fn()};
it('opens a public board with sector and empire inspection but no player actions',()=>{
 const view=fixture();render(<SpectatorBoard view={view} history={feed()} connected {...callbacks}/>);
 expect(screen.getByText('Spectating')).toBeVisible();expect(screen.getByText(/Following every player/)).toBeVisible();
 const sector=view.sectors[0];fireEvent.click(screen.getAllByRole('button',{name:new RegExp(`Inspect sector ${sector.tileId},`)})[0]);
 expect(screen.getByRole('region',{name:`Sector ${sector.tileId} details`})).toBeVisible();expect(screen.getByRole('button',{name:'Resume following'})).toBeVisible();
 fireEvent.click(screen.getByRole('button',{name:'Inspect Hydran Progress command center'}));
 expect(screen.getByRole('heading',{name:'Researched technologies'})).toBeVisible();expect(screen.getByRole('heading',{name:'Science income'})).toBeVisible();
 fireEvent.click(screen.getByRole('button',{name:'Inspect Cruiser blueprint'}));expect(screen.getByRole('group',{name:'Cruiser installed loadout'})).toBeVisible();
 expect(screen.queryByRole('button',{name:'Colonize planets'})).toBeNull();expect(screen.queryByRole('button',{name:'Research technology'})).toBeNull();expect(screen.queryByText('Your reputation')).toBeNull();
});
it('follows committed human and AI actions, preserves manual inspection across updates and resumes',()=>{
 const view=fixture();const {rerender}=render(<SpectatorBoard view={view} history={feed()} connected {...callbacks}/>);
 const sector=view.sectors[0],other=view.sectors[1];
 const human:PublicHistoryEntry={revision:view.revision+1,actorSeatId:'a',actorName:'Human',round:1,summary:'Human explored',details:[],presentation:{kind:'explore',sectorIds:[sector.id]}};
 rerender(<SpectatorBoard view={{...view,revision:human.revision}} history={feed([human])} connected {...callbacks}/>);
 expect(screen.getByRole('region',{name:'Current public action'})).toHaveTextContent('Human explored');
 fireEvent.click(screen.getAllByRole('button',{name:new RegExp(`Inspect sector ${other.tileId},`)})[0]);
 const ai={...human,revision:human.revision+1,actorSeatId:'b',actorName:'AI',summary:'AI explored'};
 rerender(<SpectatorBoard view={{...view,revision:ai.revision,activeSeatId:'b'}} history={feed([ai,human])} connected {...callbacks}/>);
 expect(screen.getByRole('region',{name:`Sector ${other.tileId} details`})).toBeVisible();expect(screen.queryByRole('region',{name:`Sector ${sector.tileId} details`})).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Resume following'}));expect(screen.getByRole('region',{name:'Current public action'})).toHaveTextContent('AI explored');
});
it('pauses focus on camera navigation and allows public history and market inspection while disconnected',()=>{
 const view=fixture();render(<SpectatorBoard view={view} history={feed()} connected={false} {...callbacks}/>);
 expect(screen.getByText(/Reconnecting/)).toBeVisible();fireEvent.click(screen.getByRole('button',{name:'Zoom in'}));expect(screen.getByRole('button',{name:'Resume following'})).toBeVisible();
 fireEvent.click(screen.getByRole('button',{name:'Technologies'}));expect(screen.getByRole('heading',{name:'Available technologies'})).toBeVisible();
 fireEvent.click(screen.getByRole('button',{name:'History'}));expect(screen.getByRole('log',{name:'Match actions'})).toBeVisible();
});
it('shows final standings and exposes no gameplay controls after a game ends',()=>{
 const view=fixture();view.phase='finished';render(<SpectatorBoard view={view} history={feed()} connected {...callbacks}/>);
 fireEvent.click(screen.getByRole('button',{name:'Standings'}));expect(screen.getByRole('heading',{name:'Final standings'})).toBeVisible();
 expect(within(screen.getByRole('region',{name:'Standings'})).getAllByRole('article')).toHaveLength(2);
 expect(screen.queryByRole('button',{name:'Play again'})).toBeNull();
});

it('focuses the current player on join instead of stale spatial history and makes failed timers read-only',()=>{
 const view=fixture();view.activeSeatId='b';
 const old:PublicHistoryEntry={revision:view.revision,actorSeatId:'a',actorName:'Human',round:1,summary:'Old move',details:[],presentation:{kind:'move',sectorIds:[view.sectors[0].id],shipIds:[]}};
 const {container}=render(<SpectatorBoard view={view} history={feed([old])} connected timer={{status:'failed',deadlineAt:0}} {...callbacks}/>);
 expect(screen.getByText('AI takeover paused')).toBeVisible();expect(screen.queryByRole('button',{name:'Retry takeover'})).toBeNull();
 const ownSector=view.sectors.find(sector=>sector.owner==='b')!;
 const focus=galaxyPoint(ownSector.position);
 expect(container.querySelector('[data-galaxy-camera]')?.getAttribute('transform')).toContain(`scale(1.5) translate(${-focus.x} ${-focus.y})`);
 fireEvent.keyDown(screen.getAllByRole('button',{name:new RegExp(`Inspect sector ${ownSector.tileId},`)})[0],{key:'Enter'});
 expect(screen.getByRole('region',{name:`Sector ${ownSector.tileId} details`})).toBeVisible();
});
it('keeps an abandoned game inspectable without reporting a live turn',()=>{
 const view=fixture();render(<SpectatorBoard view={view} history={feed()} connected lifecycle="abandoned" {...callbacks}/>);
 expect(screen.getByText('Game abandoned')).toBeVisible();expect(screen.queryByText(/taking a turn/)).toBeNull();
 expect(screen.queryByRole('button',{name:'Pause following'})).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Inspect Hydran Progress command center'}));
 expect(screen.getByRole('heading',{name:'Science income'})).toBeVisible();
});
it('explains enabled public reputation without calling it hidden',()=>{
 const view=fixture();view.ruleOptions={publicReputation:true};
 render(<SpectatorBoard view={view} history={feed()} connected {...callbacks}/>);
 fireEvent.click(screen.getByRole('button',{name:'Standings'}));
 fireEvent.click(screen.getAllByRole('button',{name:'Reputation: 0 VP'})[0]);
 expect(within(screen.getByRole('dialog',{name:'Public score inspection'})).getByRole('heading',{name:'Reputation · 0 VP'})).toBeVisible();
});
