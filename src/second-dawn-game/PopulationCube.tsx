import type {Resource} from '../../shared/eclipse/types';
const names={money:'Money',science:'Science',materials:'Materials'};
export default function PopulationCube({resource,planned=false,color='currentColor'}:{resource?:Resource;planned?:boolean;color?:string}){
 return <svg className="dg-population-cube" viewBox="0 0 20 20" role="img" aria-label={resource?`${planned?'Planned':'Occupied'} ${names[resource]} cube`:'Empty population square'}>{resource?<><path d="M3 6 10 2l7 4v8l-7 4-7-4Z" fill={color} fillOpacity={planned?.3:1} stroke="currentColor" strokeWidth="1.4" strokeDasharray={planned?'2 2':undefined}/><path d="m3 6 7 4 7-4M10 10v8" fill="none" stroke="currentColor" strokeWidth="1"/></>:<rect x="4" y="4" width="12" height="12" rx="1" fill="none" stroke="currentColor" strokeWidth="1.3"/>}</svg>;
}
