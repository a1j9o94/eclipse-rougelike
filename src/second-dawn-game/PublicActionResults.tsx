import type { FactionId } from '../../shared/eclipse/catalog';
import type { PublicCombatRetreat, PublicHistoryEntry, PublicUpgradeChange } from '../../shared/eclipse/history';
import { getShipPart } from '../../shared/eclipse/parts';
import { shipClassName } from './shipLabels';
import ShipPartStats from './ShipPartStats';

export function UpgradeChanges({ changes, faction, showStats = false }: {
  changes: readonly PublicUpgradeChange[];
  faction?: FactionId;
  showStats?: boolean;
}) {
  if (changes.length === 0) return <p>No slots changed.</p>;
  return <div className="dg-upgrade-changes">
    {changes.map(({ shipType, slot, before, after }) => (
      <div className="dg-upgrade-change" key={`${shipType}:${slot}:${before}:${after}`}>
        <small>{shipClassName(shipType, faction)} · {slot === 'outside' ? 'Outside blueprint' : `Slot ${slot + 1}`}</small>
        <span>{before ? getShipPart(before).name : 'Empty'} <span aria-label="changed to">→</span> <strong>{after ? getShipPart(after).name : 'Empty'}</strong></span>
        {showStats && after && <ShipPartStats partId={after}/>}
      </div>
    ))}
  </div>;
}

export function AiUpgradeRecap({ entry, onDismiss }: {
  entry: PublicHistoryEntry;
  onDismiss: () => void;
}) {
  const upgrade = entry.presentation;
  if (upgrade?.kind !== 'upgrade') return null;
  const { changes } = upgrade;
  return <section className="dg-ai-upgrade-recap" aria-label="AI upgrade recap">
    <details key={entry.revision}>
      <summary><strong>{entry.actorName} upgraded</strong><span>{changes?.length ? `${changes.length} ${changes.length === 1 ? 'slot' : 'slots'} changed` : 'View upgrade'}</span></summary>
      {changes ? <UpgradeChanges changes={changes} faction={entry.actorFaction}/> : <p>{upgrade.shipTypes.map(type => shipClassName(type, entry.actorFaction)).join(' · ')}</p>}
    </details>
    <button type="button" onClick={onDismiss} aria-label="Dismiss AI upgrade recap">Dismiss</button>
  </section>;
}

export function BattleRetreats({ retreats, announce = false, onDismiss }: {
  retreats: readonly PublicCombatRetreat[];
  announce?: boolean;
  onDismiss?: () => void;
}) {
  if (retreats.length === 0) return null;
  return <div className="dg-battle-retreats">
    <div role={announce ? 'status' : undefined} aria-label={announce ? 'Battle retreats' : undefined}>
      {retreats.map((retreat, index) => {
        const type = shipClassName(retreat.shipType, retreat.ownerFaction);
        return <p key={`${retreat.battleId}:${retreat.owner}:${retreat.shipType}:${index}`}>
          <strong>{retreat.ownerName}</strong> · {retreat.count} {type}{retreat.count === 1 ? '' : 's'} retreated to sector {retreat.destinationTileId}.
        </p>;
      })}
    </div>
    {onDismiss && <button type="button" onClick={onDismiss} aria-label="Dismiss battle retreat recap">Dismiss</button>}
  </div>;
}
