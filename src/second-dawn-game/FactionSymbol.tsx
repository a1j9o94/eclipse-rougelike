import {getFaction, type FactionId, type FactionVisualIdentity} from '../../shared/eclipse/catalog';
import './factionSymbol.css';
/** Original civilization emblems; both faces of a civilization share an emblem. */
const EMBLEMS:Record<FactionVisualIdentity,string>={
 exiles:'M12 3A9 9 0 1 0 12 21A9 9 0 1 0 12 3 M12 7A5 5 0 1 0 12 17A5 5 0 1 0 12 7 M3 12H21',
 eridani:'M4 6 12 2 20 6 18 16 12 22 6 16Z M8 9H16 M12 6V17',
 hydran:'M12 2 22 18H2Z M12 8V16 M8 18H16',
 planta:'M12 21V10 M12 15C2 15 2 5 3 3 12 3 12 11 12 15 M12 12C12 5 18 3 22 3 22 10 18 13 12 12',
 draco:'M3 5 10 8 13 2 16 9 22 12 16 15 13 22 10 16 3 19 7 12Z',
 mechanema:'M7 2H17L22 12 17 22H7L2 12Z M7 12 12 6 17 12 12 18Z',
 'rho-indi':'M4 4 12 8 20 4 17 12 20 20 12 16 4 20 7 12Z M8 12H16 M12 8V16',
 magellan:'M12 2V22 M2 12H22 M5 5 19 19 M19 5 5 19 M12 6 18 12 12 18 6 12Z',
 lyra:'M12 2 19 7 19 17 12 22 5 17 5 7Z M12 6V18 M7 12H17 M8 8 16 16 M16 8 8 16',
 midas:'M3 7 7 12 12 3 17 12 21 7 18 20H6Z M7 16H17',
 ragnarok:'M4 3 9 7 7 12 12 21 17 12 15 7 20 3 M7 12H17 M12 3V14',
 orion:'M4 3H20L14 12 20 21H4L10 12Z M4 3 20 21 M20 3 4 21',
};
export default function FactionSymbol({faction,className=''}:{faction:FactionId;className?:string}){
 const definition=getFaction(faction);
 return <svg className={`dg-faction-symbol ${className}`} role="img" aria-label={`${definition.name} emblem`} data-civilization={definition.emblem} width="24" height="24" viewBox="0 0 24 24"><path d={EMBLEMS[definition.emblem]} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/></svg>;
}
