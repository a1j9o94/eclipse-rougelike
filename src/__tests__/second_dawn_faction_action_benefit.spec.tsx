// @vitest-environment jsdom
import {cleanup,render,screen} from '@testing-library/react';
import {afterEach,expect,it} from 'vitest';
import FactionActionBenefit from '../second-dawn-game/FactionActionBenefit';
afterEach(cleanup);
it('shows the human trade advantage where trading happens',()=>{
 render(<FactionActionBenefit factionId="terran-directorate" action="trade"/>);
 expect(screen.getByLabelText('Terran Directorate faction effect')).toHaveTextContent('2:1');
});
it('shows production capacity and cheaper construction for Mechanema',()=>{
 render(<FactionActionBenefit factionId="mechanema" action="build"/>);
 expect(screen.getByText('3')).toBeInTheDocument();expect(screen.getByText(/Reduced construction prices/)).toBeInTheDocument();
});
it('does not imply a standard faction has another faction’s advantage',()=>{
 const ui=render(<FactionActionBenefit factionId="eridani" action="research"/>);expect(ui.container).toBeEmptyDOMElement();
 ui.rerender(<FactionActionBenefit factionId="hydran" action="research"/>);expect(screen.getByText('2')).toBeInTheDocument();
});
it('makes Ancient movement exceptions visible for Draco without claiming immunity from other ships',()=>{
 render(<FactionActionBenefit factionId="draco" action="move"/>);expect(screen.getByText(/Ancients do not pin your ships/)).toBeInTheDocument();
});
