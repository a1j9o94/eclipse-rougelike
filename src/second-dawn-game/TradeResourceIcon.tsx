import type {Resource} from '../../shared/eclipse/types';
import {PlanetIcon} from './SectorPlanets';
export default function TradeResourceIcon({resource}:{resource:Resource}) {
 return <svg className={`dg-trade-icon dg-trade-${resource}`} viewBox="0 0 20 20" aria-hidden="true"><PlanetIcon resource={resource}/></svg>;
}
