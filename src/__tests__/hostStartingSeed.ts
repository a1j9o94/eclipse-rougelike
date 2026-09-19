import {vi} from 'vitest';
import type {GameSetup} from '../../shared/eclipse/setup';

/** Adapter scenarios needing an immediate host command pin only the setup seed.
 * The real randomized-start setup still runs; token/lease randomness stays independent.
 * The random-starter integration suite deliberately does not import this fixture.
 */
vi.mock('../../shared/eclipse/setup',async importOriginal=>{
 const setup=await importOriginal<typeof import('../../shared/eclipse/setup')>();
 return {...setup,createGame:(config:GameSetup)=>setup.createGame({...config,seed:32})};
});
