import {vi} from 'vitest';
import type {GameSetup} from '../../shared/eclipse/setup';

/** Adapter scenarios needing an immediate host command find a deterministic host-start seed.
 * The real randomized-start setup still runs; token/lease randomness stays independent.
 * The random-starter integration suite deliberately does not import this fixture.
 */
vi.mock('../../shared/eclipse/setup',async importOriginal=>{
 const setup=await importOriginal<typeof import('../../shared/eclipse/setup')>();
 return {...setup,createGame:(config:GameSetup)=>{
  for(let seed=32;seed<1032;seed++){
    const state=setup.createGame({...config,seed});
    if(state.activeSeatId===config.seats[0].id)return state;
  }
  throw new Error('Could not find a host-start setup seed.');
 }};
});
