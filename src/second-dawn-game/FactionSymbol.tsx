import {getFaction, type CivilizationColor, type FactionId} from '../../shared/eclipse/catalog';
import './factionSymbol.css';
/** Original civilization emblems; both faces of a civilization share an emblem. */
const EMBLEMS:Record<CivilizationColor,string>={
 red:'M4 6 12 2 20 6 18 16 12 22 6 16Z M8 9H16 M12 6V17',
 blue:'M12 2 22 18H2Z M12 8V16 M8 18H16',
 green:'M12 21V10 M12 15C2 15 2 5 3 3 12 3 12 11 12 15 M12 12C12 5 18 3 22 3 22 10 18 13 12 12',
 yellow:'M3 5 10 8 13 2 16 9 22 12 16 15 13 22 10 16 3 19 7 12Z',
 white:'M7 2H17L22 12 17 22H7L2 12Z M7 12 12 6 17 12 12 18Z',
 black:'M4 3H20L14 12 20 21H4L10 12Z M4 3 20 21 M20 3 4 21',
};
export default function FactionSymbol({faction,className=''}:{faction:FactionId;className?:string}){
 const definition=getFaction(faction);
 return <svg className={`dg-faction-symbol ${className}`} role="img" aria-label={`${definition.name} emblem`} data-civilization={definition.color} width="24" height="24" viewBox="0 0 24 24"><path d={EMBLEMS[definition.color]} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/></svg>;
}
