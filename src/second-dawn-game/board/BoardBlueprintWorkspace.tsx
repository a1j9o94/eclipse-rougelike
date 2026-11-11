import type { GameCommand, PlayerView } from '../../../shared/eclipse/types';
import { getFaction } from '../../../shared/eclipse/catalog';
import { publicBlueprint } from '../../../shared/eclipse/legal';
import { researchedTechnologyIds, type TechnologyId } from '../../../shared/eclipse/technologies';
import {
  deriveBlueprintStats,
  effectiveBlueprintParts,
  type BlueprintShipType,
  type ShipBlueprint,
} from '../../../shared/eclipse/blueprints';
import { getShipPart } from '../../../shared/eclipse/parts';
import type { AncientShipPartId } from '../../../shared/eclipse/discoveries';
import BlueprintEditor from '../BlueprintEditor';
import ShipSilhouette from '../ShipSilhouette';
import ShipPartStats from '../ShipPartStats';
import { shipClassName } from '../shipLabels';
import { humanize } from './boardLabels';
interface BlueprintWorkspaceProps {
  view: PlayerView;
  planningView: PlayerView;
  playerId: string;
  editing: BlueprintShipType | null;
  blocked: boolean;
  blueprintDrafts: { revision: number; drafts: Partial<Record<BlueprintShipType, ShipBlueprint>> };
  rememberBlueprintDraft: (draft: ShipBlueprint) => void;
  onSelectOwner: (seatId: string) => void;
  onSelectClass: (shipType: BlueprintShipType | null) => void;
  onEditOwn: () => void;
  onSubmit: (command: GameCommand) => void;
}
export default function BoardBlueprintWorkspace({
  view,
  planningView,
  playerId,
  editing,
  blocked,
  blueprintDrafts,
  rememberBlueprintDraft,
  onSelectOwner,
  onSelectClass,
  onEditOwn,
  onSubmit,
}: BlueprintWorkspaceProps) {
  const own = view.seats.find((seat) => seat.id === view.viewerSeatId)!;
  const inspectedPlayer = view.seats.find((seat) => seat.id === playerId) ?? own;
  const faction = (id: string) => {
    const seat = view.seats.find((seat) => seat.id === id);
    return seat ? getFaction(seat.faction) : undefined;
  };
  return (
    <div className="sd-workspace">
      <div className="dg-blueprint-heading" hidden={!!editing && inspectedPlayer.id === own.id}>
        <h1>Upgrade</h1>
        <label className="dg-blueprint-owner">
          Civilization{' '}
          <select
            aria-label="Blueprint civilization"
            value={inspectedPlayer.id}
            onChange={(event) => onSelectOwner(event.target.value)}
          >
            {view.seats.map((seat) => (
              <option key={seat.id} value={seat.id}>
                {faction(seat.id)?.name}
                {seat.id === own.id ? ' (you)' : ''}
              </option>
            ))}
          </select>
        </label>
      </div>
      <nav className="dg-class-selector" aria-label="Ship classes">
        {inspectedPlayer.blueprints.map((bp) => (
          <button
            key={bp.shipType}
            aria-pressed={editing === bp.shipType}
            disabled={getFaction(inspectedPlayer.faction).componentSupply?.[bp.shipType] === 0}
            title={
              getFaction(inspectedPlayer.faction).componentSupply?.[bp.shipType] === 0
                ? `${getFaction(inspectedPlayer.faction).name} does not use this ship class.`
                : undefined
            }
            onClick={() => onSelectClass(bp.shipType)}
          >
            {shipClassName(bp.shipType, inspectedPlayer.faction)}
          </button>
        ))}
        <button aria-pressed={editing === null} onClick={() => onSelectClass(null)}>
          All loadouts
        </button>
      </nav>
      {editing &&
      inspectedPlayer.id === own.id &&
      getFaction(own.faction).componentSupply?.[editing] !== 0 ? (
        <BlueprintEditor
          key={`${editing}-${view.revision}`}
          view={planningView}
          blueprints={own.blueprints.map(publicBlueprint)}
          initialDraft={
            blueprintDrafts.revision === view.revision ? blueprintDrafts.drafts[editing] : undefined
          }
          onDraftChange={rememberBlueprintDraft}
          faction={own.faction}
          blueprint={publicBlueprint(own.blueprints.find((bp) => bp.shipType === editing)!)}
          technologies={researchedTechnologyIds(own) as TechnologyId[]}
          storedParts={(own.storedParts ?? []) as AncientShipPartId[]}
          installedAncientParts={own.blueprints
            .flatMap((candidate) => {
              const blueprint = publicBlueprint(candidate);
              return [...blueprint.parts, ...blueprint.outsideParts];
            })
            .filter(
              (id): id is AncientShipPartId =>
                id !== null && getShipPart(id).access.kind === 'ancient',
            )}
          capacity={
            planningView.actionProgress?.action === 'upgrade'
              ? planningView.actionProgress.remaining
              : own.passed
                ? 1
                : getFaction(own.faction).activations.upgrade +
                  (researchedTechnologyIds(own).includes('pico-modulator') ? 2 : 0)
          }
          disabled={
            blocked ||
            planningView.activeSeatId !== own.id ||
            view.phase !== 'action' ||
            (!!planningView.actionProgress && planningView.actionProgress.action !== 'upgrade') ||
            (!planningView.actionProgress && own.influenceOnTrack === 0)
          }
          onSubmit={onSubmit}
        />
      ) : (
        <div className="dg-blueprints">
          {inspectedPlayer.blueprints
            .filter(
              (bp) =>
                getFaction(inspectedPlayer.faction).componentSupply?.[bp.shipType] !== 0 &&
                (editing === null || bp.shipType === editing),
            )
            .map((bp) => (
              <section key={bp.shipType} className="dg-loadout-card">
                <header>
                  <ShipSilhouette type={bp.shipType} faction={inspectedPlayer.faction} />
                  <h2>{shipClassName(bp.shipType, inspectedPlayer.faction)}</h2>
                </header>
                {(() => {
                  const stats = deriveBlueprintStats(inspectedPlayer.faction, publicBlueprint(bp));
                  const yours = own.blueprints.find((b) => b.shipType === bp.shipType);
                  const ownStats = yours
                    ? deriveBlueprintStats(own.faction, publicBlueprint(yours))
                    : null;
                  return (
                    <>
                      <p>
                        Hull {stats.hull} · move {stats.movement} · initiative {stats.initiative}
                      </p>
                      <p>
                        Computer +{stats.computer} · shield −{stats.shield} · energy{' '}
                        {stats.energyProduction - stats.energyConsumption}
                      </p>
                      <p>
                        {stats.weapons.map((w) => `${w.dice} ${w.color} ${w.kind}`).join(' · ') ||
                          'No weapons'}
                      </p>
                      {inspectedPlayer.id !== own.id && ownStats && (
                        <p className="dg-compare">
                          Your {shipClassName(bp.shipType, inspectedPlayer.faction)}: hull{' '}
                          {ownStats.hull}, move {ownStats.movement}, initiative{' '}
                          {ownStats.initiative}, computer +{ownStats.computer}, shield −
                          {ownStats.shield}
                        </p>
                      )}
                    </>
                  );
                })()}
                {effectiveBlueprintParts(inspectedPlayer.faction, publicBlueprint(bp)).map(
                  (part, i) => (
                    <div className="dg-part" key={i}>
                      <strong>{part ? humanize(part) : 'Empty slot'}</strong>
                      {part && <ShipPartStats partId={part} />}
                    </div>
                  ),
                )}
                {publicBlueprint(bp).outsideParts.map((part, i) => (
                  <div className="dg-part" key={`outside-${i}`}>
                    <strong>{humanize(part)} · outside grid</strong>
                    <ShipPartStats partId={part} />
                  </div>
                ))}
                {inspectedPlayer.id === own.id && (
                  <button onClick={() => onSelectClass(bp.shipType)}>
                    Edit {shipClassName(bp.shipType, inspectedPlayer.faction)}
                  </button>
                )}
              </section>
            ))}
        </div>
      )}
      {(!editing || inspectedPlayer.id !== own.id) && (
        <button onClick={onEditOwn}>Edit your blueprint</button>
      )}
    </div>
  );
}
