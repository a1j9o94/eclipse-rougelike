// @vitest-environment node
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import type { GameState } from '../../shared/eclipse/types';
import { sectorDefinition } from '../../shared/eclipse/sectors';
const fixtures: Record<string, GameState> = JSON.parse(readFileSync('src/second-dawn-game/reviewFixtures.json','utf8'));
it('includes an actual pending explored sector with Ancient defenders',()=>{const s=fixtures['exploration-ancients'];expect(s).toBeDefined();expect(s.pendingDecision?.kind).toBe('exploration');if(s.pendingDecision?.kind!=='exploration')throw new Error('Expected exploration');expect(s.pendingDecision.drawnTileIds.some(id=>(sectorDefinition(Number(id))?.ancients??0)>0)).toBe(true);});
it('includes a resumable player decision in combat against an Ancient fleet',()=>{const s=fixtures['ancient-combat'];expect(s).toBeDefined();const battle=s.engine?.battle;expect(battle).toBeTruthy();expect([battle?.attacker,battle?.defender]).toContain('ancient');expect(s.seats.some(seat=>seat.id===s.pendingDecision?.owner)).toBe(true);expect(s.ships.some(ship=>ship.sectorId===battle?.sectorId&&ship.type==='ancient')).toBe(true);});
it('includes a nonpending galaxy position showing surviving Ancients',()=>{const s=fixtures.ancients;expect(s).toBeDefined();expect(s.pendingDecision).toBeNull();expect(s.ships.some(ship=>ship.type==='ancient')).toBe(true);expect(s.phase).not.toBe('finished');});
