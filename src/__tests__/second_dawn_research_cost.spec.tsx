// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import ResearchCost, { ScienceBudget } from '../second-dawn-game/ResearchCost';
afterEach(cleanup);
it('shows one effective cost and a distinct shortfall instead of repeating the full price',()=>{render(<ResearchCost cost={13} available={8}/>);expect(screen.getByText('13')).toBeTruthy();expect(screen.getAllByText('13')).toHaveLength(1);expect(screen.getByText('Need 5 more')).toBeTruthy();expect(screen.getByRole('img',{name:/Research cost: 13 science.*8 available.*5 more/})).toBeTruthy();});
it('shows affordable cost and available science as different quantities',()=>{render(<><ScienceBudget available={8}/><ResearchCost cost={5} available={8}/></>);expect(screen.getByRole('img',{name:'Science available: 8'})).toBeTruthy();expect(screen.getByText('Within budget')).toBeTruthy();});
it('distinguishes already researched, unavailable and lowest available track costs',()=>{const{rerender}=render(<ResearchCost cost={null} available={8} owned/>);expect(screen.getByText('Researched')).toBeTruthy();rerender(<ResearchCost cost={null} available={8}/>);expect(screen.getByText('Track unavailable')).toBeTruthy();rerender(<ResearchCost cost={7} available={8} from/>);expect(screen.getByText('from')).toBeTruthy();});
