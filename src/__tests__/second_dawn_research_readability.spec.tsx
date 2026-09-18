// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { createGame } from '../../shared/eclipse/setup';
import { getPlayerView } from '../../shared/eclipse/protocol';
import { legalCommands } from '../../shared/eclipse/legal';
import SecondDawnBoard from '../second-dawn-game/SecondDawnBoard';
afterEach(cleanup);
it('explains technology behavior before selection and in its inspector without committing a draw', () => {
 const state=createGame({seed:11,warpPortals:true,seats:[{id:'a',faction:'terran-directorate',controller:'human'},{id:'b',faction:'terran-federation',controller:'ai'}]});
 state.technologyMarket=['wormhole-generator','gluon-computer','orbital'];
 const view=getPlayerView(state,'a')!;
 const submit=vi.fn();
 render(<SecondDawnBoard view={view} candidates={legalCommands(view)} connected busy={false} status="" onSubmit={submit} onMenu={vi.fn()}/>);
 fireEvent.click(screen.getAllByRole('button',{name:'Research',exact:true})[0]);
 const card=screen.getByRole('button',{name:/Wormhole Generator/});
 expect(within(card).getByLabelText(/opening needed: 1/)).toBeTruthy();
 expect(card.textContent).toMatch(/wormhole/i);
 fireEvent.click(card);
 expect(within(screen.getByRole('region',{name:'Research Wormhole Generator'})).getByText(/normally both facing edges need one/)).toBeTruthy();
 const computer=screen.getByRole('button',{name:/Gluon Computer/});
 expect(within(computer).getByLabelText(/computer: \+3/)).toBeTruthy();
 expect(within(computer).getByLabelText(/energy: −2/)).toBeTruthy();
 expect(computer.textContent).not.toMatch(/Unlocks this part/);
 expect(submit).not.toHaveBeenCalled();
});
