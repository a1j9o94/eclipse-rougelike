// @vitest-environment jsdom
import {
  fireEvent,
  render,
  screen,
  cleanup,
  within,
} from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import SecondDawnPrototype from '../second-dawn/SecondDawnPrototype';
afterEach(cleanup);
describe('Second Dawn visual prototype', () => {
  it('identifies fixtures honestly and exposes sector facts in one selection', () => {
    render(<SecondDawnPrototype />);
    expect(screen.getByText(/Visual prototype/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Late game' }));
    expect(
      screen.getAllByRole('button', { name: /Inspect sector/ }).length,
    ).toBe(37);
    expect(screen.getByLabelText('Pending battle in sector 117')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Inspect sector 101/ }));
    expect(screen.getByRole('heading', { name: /Sector 101/ })).toBeTruthy();
    expect(screen.getByText('Connections')).toBeTruthy();
  });
  it('uses catalog research tracks and shows final results without active actions', () => {
    render(<SecondDawnPrototype />);
    fireEvent.click(
      screen.getAllByRole('button', { name: 'Research', exact: true })[0],
    );
    const grid = screen.getByRole('heading', { name: 'Grid' }).parentElement!;
    expect(
      within(grid).getByRole('button', { name: /Improved Hull/ }),
    ).toBeTruthy();
    fireEvent.click(
      screen.getByRole('button', { name: 'Scoring', exact: true }),
    );
    expect(screen.getByText('Game over · final results')).toBeTruthy();
    expect(screen.queryByText('You · choosing an action')).toBeNull();
    expect(screen.getByText('You · finished')).toBeTruthy();
    expect(screen.getByRole('status').textContent).toContain('scoring');
    expect(
      (
        screen.getByRole('button', {
          name: 'Explore',
          exact: true,
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });
  it('keeps upgrade drafts editable and requires confirmation', () => {
    render(<SecondDawnPrototype />);
    fireEvent.click(screen.getByRole('button', { name: 'Blueprints' }));
    fireEvent.click(
      screen.getByRole('button', { name: 'Select Plasma cannon' }),
    );
    expect(screen.getByText('Draft: Plasma cannon')).toBeTruthy();
    fireEvent.click(
      screen.getByRole('button', { name: 'Confirm prototype upgrade' }),
    );
    expect(screen.getByRole('status').textContent).toContain(
      'Prototype blueprint updated',
    );
  });
  it('requires allocation of the full hit pool before combat confirmation', () => {
    render(<SecondDawnPrototype />);
    fireEvent.click(screen.getByRole('button', { name: 'Combat' }));
    const confirm = screen.getByRole('button', {
      name: 'Confirm hit allocation',
    }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    fireEvent.click(
      screen.getByRole('button', { name: 'Assign hit to enemy cruiser' }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Assign hit to enemy cruiser' }),
    );
    expect(confirm.disabled).toBe(false);
    fireEvent.click(confirm);
    expect(screen.getByRole('status').textContent).toContain(
      'allocation confirmed',
    );
  });
});
