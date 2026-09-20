// @vitest-environment jsdom
import {expect,it} from 'vitest';
import {render,screen} from '@testing-library/react';
import TechnologyStats from '../second-dawn-game/TechnologyStats';
import {getTechnology} from '../../shared/eclipse/technologies';
it('shows badges for multi-action technologies and colony ships',()=>{const {rerender}=render(<TechnologyStats technology={getTechnology('optimal-logistics')}/>);expect(screen.getByLabelText(/move: \+1/i)).toBeTruthy();expect(screen.getByLabelText(/build: \+1/i)).toBeTruthy();rerender(<TechnologyStats technology={getTechnology('advanced-colony-ships')}/>);expect(screen.getByLabelText(/colony ship: \+1/i)).toBeTruthy();});
