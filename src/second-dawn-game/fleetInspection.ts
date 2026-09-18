import {getFaction} from "../../shared/eclipse/catalog";
import {deriveBlueprintStats,neutralBlueprint} from "../../shared/eclipse/blueprints";
import {publicBlueprint} from "../../shared/eclipse/legal";
import type {PlayerView,Ship} from "../../shared/eclipse/types";
import type {ShipStats} from "../../shared/eclipse/parts";
export interface PublicShipProfile {ship:Ship;name:string;ownerName:string;stats:ShipStats;remainingHp:number;maximumHp:number}
export function publicShipProfile(view:PlayerView,id:string):PublicShipProfile|null{
 const ship=view.ships.find(s=>s.id===id);if(!ship)return null;
 const seat=view.seats.find(s=>s.id===ship.owner);
 const neutral=ship.type==='ancient'||ship.type==='guardian'||ship.type==='gcds';
 const blueprint=seat?.blueprints.find(b=>b.shipType===ship.type);
 const stats=neutral?neutralBlueprint(`${ship.type as 'ancient'|'guardian'|'gcds'}-standard`).stats:seat&&blueprint?deriveBlueprintStats(seat.faction,publicBlueprint(blueprint)):null;
 if(!stats)return null;
 return {ship,name:ship.type==='gcds'?'GCDS':ship.type[0].toUpperCase()+ship.type.slice(1),ownerName:seat?getFaction(seat.faction).name:'Neutral defenders',stats,maximumHp:stats.hull+1,remainingHp:Math.max(0,stats.hull+1-ship.damage)};
}
export function hitFaceDescription(computer:number,shield:number):string{
 const required=6-computer+shield;return required>6?'Natural 6 only':required>=6?'6 to hit':`${Math.max(2,required)}–6 to hit`;
}
