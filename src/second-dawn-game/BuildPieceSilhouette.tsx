import type {FactionId} from '../../shared/eclipse/catalog';
import type {BuildComponent} from '../../shared/eclipse/history';
import ShipSilhouette from './ShipSilhouette';
import StructureSilhouette from './StructureSilhouette';

/** Exiles use their armed Orbital identity wherever a buildable piece is shown. */
export default function BuildPieceSilhouette({component, faction}: {component: BuildComponent; faction?: FactionId}) {
  if(component==='orbital'&&faction==='exiles')return <ShipSilhouette type="starbase" faction={faction}/>;
  if(component==='orbital'||component==='monolith')return <StructureSilhouette kind={component}/>;
  return <ShipSilhouette type={component} faction={faction}/>;
}
