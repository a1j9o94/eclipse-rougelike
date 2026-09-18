import { getShipPart, type ShipPartId } from '../../shared/eclipse/parts';
import './itemDetails.css';
export type StatIconName = 'computer' | 'energy' | 'shield' | 'hull' | 'drive' | 'initiative' | 'cannon' | 'missile' | 'structure' | 'population' | 'influence' | 'portal' | 'discovery';
const PATHS: Record<StatIconName, string> = {
 computer: 'M4 5h16v12H4z M8 21h8 M12 17v4 M8 9h8 M8 12h5',
 energy: 'M13 2 5 14h6l-1 8 9-13h-7z',
 shield: 'M12 2 21 6v6c0 5-9 10-9 10S3 17 3 12V6z',
 hull: 'M7 3h10l5 9-5 9H7L2 12z M7 8h10v8H7z',
 drive: 'M12 2 18 10v8H6v-8z M9 19v3 M15 19v3 M12 18v5',
 initiative: 'M4 8 10 3 16 8 M10 3v16 M15 13 20 8 23 13 M20 8v13',
 cannon: 'M3 18 6 21 20 7 17 4z M12 4 15 1 M20 12l3-3',
 missile: 'M3 21 6 13 16 3 21 3 21 8 11 18z M7 17l-4 4 M16 4l4 4',
 structure: 'M4 21V9h16v12 M2 9l10-7 10 7 M9 21v-7h6v7',
 population: 'M8 8a4 4 0 1 0 8 0a4 4 0 1 0-8 0 M4 22v-4c0-6 16-6 16 0v4',
 influence: 'M3 12a9 9 0 1 0 18 0a9 9 0 1 0-18 0 M7 12a5 5 0 1 0 10 0a5 5 0 1 0-10 0',
 portal: 'M7 12a5 10 0 1 0 10 0a5 10 0 1 0-10 0 M1 12h22 M18 8l5 4-5 4',
 discovery: 'M12 2 15 9 22 12 15 15 12 22 9 15 2 12 9 9z',
};
export function StatIcon({ kind }: { kind: StatIconName }) { return <svg viewBox="0 0 24 24" aria-hidden="true" className="dg-stat-icon"><path d={PATHS[kind]} /></svg>; }
export interface StatBadgeProps { icon: StatIconName; value: string | number; label: string; explanation: string; color?: string }
export function StatBadge({ icon, value, label, explanation, color }: StatBadgeProps) { return <span role="img" className="dg-stat-badge" title={explanation} aria-label={`${label}: ${value}. ${explanation}`} style={color ? { color } : undefined}><StatIcon kind={icon} /><strong>{value}</strong><small>{label}</small></span>; }
export default function ShipPartStats({ partId }: { partId: ShipPartId }) {
 const p = getShipPart(partId);
 const badges: StatBadgeProps[] = [];
 for (const w of p.weapons) badges.push({icon:w.kind,value:`${w.dice} × ${w.damage}`,label:w.kind === 'cannon' ? 'dice × damage' : 'missile × damage',explanation:`Roll ${w.dice} ${w.color} dice ${w.kind === 'cannon' ? 'each combat round' : 'once at the start of battle'}; each hit deals ${w.damage} damage.`,color:({yellow:'#f0d477',orange:'#ffb076',blue:'#91c9ff',red:'#ff9391'})[w.color]});
 if(p.computer)badges.push({icon:'computer',value:`+${p.computer}`,label:'computer',explanation:'Add this bonus to attack rolls.'});
 if(p.shield)badges.push({icon:'shield',value:`−${p.shield}`,label:'shield',explanation:'Subtract from enemy attack rolls against this ship.'});
 if(p.hull)badges.push({icon:'hull',value:`+${p.hull}`,label:'hull',explanation:'Survive this much additional damage.'});
 if(p.movement)badges.push({icon:'drive',value:p.movement,label:'movement',explanation:'Maximum sectors moved per ship activation.'});
 if(p.initiative)badges.push({icon:'initiative',value:`+${p.initiative}`,label:'initiative',explanation:'Higher initiative fires earlier; defender wins ties.'});
 if(p.energyProduction)badges.push({icon:'energy',value:`+${p.energyProduction}`,label:'energy',explanation:'Energy produced to power installed parts.'});
 if(p.energyConsumption)badges.push({icon:'energy',value:`−${p.energyConsumption}`,label:'energy',explanation:'Energy consumed; total production must cover use.'});
 return <div className="dg-part-stats" role="group" aria-label={`${p.name} statistics`}>{badges.map((badge,i)=><StatBadge key={i} {...badge}/>)}</div>;
}
