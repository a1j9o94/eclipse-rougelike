import {fireEvent,render,screen} from '@testing-library/react';
import {it,expect,vi} from 'vitest';
import type {GameCommand} from '../../shared/eclipse/types';
import SecondDawnReview from '../second-dawn-game/SecondDawnReview';
vi.mock('../second-dawn-game/SecondDawnBoard',()=>({default:({onSubmit,lastAcceptedCommand}:{onSubmit:(command:GameCommand)=>void;lastAcceptedCommand?:{revision:number;type:GameCommand['type']}})=><><button onClick={()=>onSubmit({type:'pass'})}>Pass fixture</button><output aria-label="Accepted command">{lastAcceptedCommand?`${lastAcceptedCommand.type}:${lastAcceptedCommand.revision}`:'none'}</output></>}));
it('acknowledges accepted fixture commands to the shared draft controller and resets the receipt on fixture changes',()=>{
 render(<SecondDawnReview/>);expect(screen.getByLabelText('Accepted command')).toHaveTextContent('none');
 fireEvent.click(screen.getByRole('button',{name:'Pass fixture'}));expect(screen.getByLabelText('Accepted command')).toHaveTextContent('pass:1');
 fireEvent.click(screen.getByRole('button',{name:'Round 4'}));expect(screen.getByLabelText('Accepted command')).toHaveTextContent('none');
});
