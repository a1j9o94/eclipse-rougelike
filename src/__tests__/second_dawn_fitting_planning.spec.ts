import { describe, expect, it } from 'vitest';
import { initialBlueprints } from '../../shared/eclipse/blueprints';
import { fittingInventory } from '../second-dawn-game/fittingPlanning';

describe('ship fitting inventory',()=>{
 it('groups available parts by tactical role instead of acquisition provenance',()=>{
  const blueprint=initialBlueprints('terran-directorate')[0];
  const inventory=fittingInventory({blueprint,draft:blueprint,technologies:['plasma-cannon','fusion-drive'],storedParts:[]});
  expect(inventory.groups.find(group=>group.name==='Weapons')?.parts.map(part=>part.id)).toContain('plasma-cannon');
  expect(inventory.groups.find(group=>group.name==='Drives')?.parts.map(part=>part.id)).toContain('fusion-drive');
  expect(inventory.groups.find(group=>group.name==='Reactors')?.parts.map(part=>part.id)).toContain('nuclear-source');
 });
 it('accounts for stored ancient copies and prevents relocating an installed ancient part',()=>{
  const blueprint=initialBlueprints('terran-directorate')[0];blueprint.parts[3]='shard-hull';
  const inventory=fittingInventory({blueprint,draft:blueprint,technologies:[],storedParts:['ion-disruptor']});
  expect(inventory.storedAncients).toEqual([{id:'ion-disruptor',count:1}]);
  expect(inventory.parts.find(part=>part.id==='ion-disruptor')).toMatchObject({available:true,availableCopies:1});
 expect(inventory.parts.find(part=>part.id==='shard-hull')).toMatchObject({available:false,reason:expect.stringMatching(/cannot be relocated/i)});
  expect(fittingInventory({blueprint:initialBlueprints('terran-directorate')[0],draft:initialBlueprints('terran-directorate')[0],technologies:[],storedParts:[],installedAncientParts:['ion-turret']}).parts.find(part=>part.id==='ion-turret')).toMatchObject({available:false,reason:expect.stringMatching(/another blueprint/i)});
 });
});
