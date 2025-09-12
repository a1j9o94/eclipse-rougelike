import { describe, it, expect, vi } from 'vitest';
import useRunManagement from '../hooks/useRunManagement';

describe('tutorial faction', () => {
  it('uses Helios Cartel regardless of selected faction', () => {
    const setters = {
      setDifficulty: vi.fn(),
      setFaction: vi.fn(),
      setOpponent: vi.fn(),
      setShowNewRun: vi.fn(),
      playEffect: vi.fn(),
      setEndless: vi.fn(),
      setLivesRemaining: vi.fn(),
      setResources: vi.fn(),
      setCapacity: vi.fn(),
      setResearch: vi.fn(),
      setRerollCost: vi.fn(),
      setBaseRerollCost: vi.fn(),
      setSector: vi.fn(),
      setBlueprints: vi.fn(),
      setFleet: vi.fn(),
      setFocused: vi.fn(),
      setShop: vi.fn(),
      startFirstCombat: vi.fn(),
      clearRunState: vi.fn(),
      setShowRules: vi.fn(),
    } as any;
    const { newRunTutorial } = useRunManagement(setters);
    newRunTutorial();
    expect(setters.setFaction).toHaveBeenCalledWith('industrialists');
  });
});
