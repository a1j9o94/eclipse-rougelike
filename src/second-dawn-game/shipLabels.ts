import type {FactionId} from '../../shared/eclipse/catalog';
import type {Ship} from '../../shared/eclipse/types';

const names:Record<Ship['type'],string>={interceptor:'Interceptor',cruiser:'Cruiser',dreadnought:'Dreadnought',starbase:'Starbase',ancient:'Ancient',guardian:'Guardian',gcds:'GCDS'};

/** Exiles use the Starbase blueprint slot for their defending Orbitals. */
export function shipClassName(type:Ship['type'],faction?:FactionId,orbitalShip=false):string{
 return type==='starbase'&&(faction==='exiles'||orbitalShip)?'Orbital':names[type];
}
