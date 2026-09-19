// @vitest-environment jsdom
import {fireEvent,render,screen} from '@testing-library/react';
import {expect,it,vi} from 'vitest';
import {createGame} from '../../shared/eclipse/setup';
import {getPlayerView} from '../../shared/eclipse/protocol';
import {legalCommands} from '../../shared/eclipse/legal';
import TradePanel from '../second-dawn-game/TradePanel';
function view(){const v=getPlayerView(createGame({seed:2,seats:[{id:'a',faction:'hydran',controller:'human'},{id:'b',faction:'eridani',controller:'ai'}]}),'a')!;v.seats[0].resources={money:6,materials:6,science:3};return v;}
it('shows Rho Indi exact input and received pair without claiming an illegal single resource trade',()=>{
 const v=view();v.seats[0].faction='rho-indi';const submit=vi.fn();render(<TradePanel view={v} candidates={legalCommands(v)} disabled={false} onSubmit={submit}/>);
 expect(screen.getByRole('img',{name:'Spend 3 money'})).toBeVisible();expect(screen.getByRole('img',{name:'Receive 2 science'})).toBeVisible();
 fireEvent.click(screen.getByRole('button',{name:'Confirm conversion'}));expect(submit).toHaveBeenCalledWith({type:'trade',from:'money',to:'science',amount:2});
});
it('quotes Magellan material conversion as 2 for 1 or 3 for 2',()=>{
 const v=view();v.seats[0].faction='magellan';render(<TradePanel view={v} candidates={legalCommands(v)} disabled={false} onSubmit={vi.fn()}/>);
 fireEvent.click(screen.getByRole('button',{name:'Pay with materials'}));expect(screen.getByRole('img',{name:'Spend 2 materials'})).toBeVisible();
 fireEvent.click(screen.getByRole('button',{name:'Increase received amount'}));expect(screen.getByRole('img',{name:'Spend 3 materials'})).toBeVisible();expect(screen.getByRole('img',{name:'Receive 2 science'})).toBeVisible();
});
