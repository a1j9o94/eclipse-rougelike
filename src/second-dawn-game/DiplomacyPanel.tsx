import { useState } from "react";
import type { CSSProperties } from "react";
import { getFaction } from "../../shared/eclipse/catalog";
import { reputationCapacity } from "../../shared/eclipse/battleEngine";
import type { GameCommand, PlayerView, Resource } from "../../shared/eclipse/types";
import type { CommandCandidate } from "./SecondDawnBoard";
import { TradeResourceIcon } from "./TradePanel";
import { incomeForPopulationAway } from "../../shared/eclipse/tracks";
import "./diplomacy.css";
interface Props {
  inspectedSeatId?: string;
  view: PlayerView;
  candidates: CommandCandidate[];
  disabled: boolean;
  onSubmit: (command: GameCommand) => void;
}
const colors = {
  red: "#e99b9b",
  blue: "#88cde7",
  green: "#8bd4ad",
  yellow: "#efd27b",
  white: "#e3e7ed",
  black: "#bac0ce",
};
const names: Record<Resource, string> = { money: "Money", science: "Science", materials: "Materials" };
const resources: readonly Resource[] = ["money", "science", "materials"];
export default function DiplomacyPanel({
  view,
  inspectedSeatId,
  candidates,
  disabled,
  onSubmit,
}: Props) {
  const own = view.seats.find(
    (s) => s.id === (inspectedSeatId ?? view.viewerSeatId),
  )!;
  const viewer = view.seats.find((seat) => seat.id === view.viewerSeatId)!;
  const isOwn = own.id === view.viewerSeatId;
  const retainedCount = isOwn
    ? view.private.reputation.length
    : (view.hiddenTileCounts.find((h) => h.seatId === own.id)?.reputation ?? 0);
  const capacity = reputationCapacity(own);
  const dedicated =
    reputationCapacity({ ...own, ambassadors: [] }) ===
    reputationCapacity({ ...own, ambassadors: [own.id] });
  const [chosenResources, setChosenResources] = useState<Record<string, Resource>>({});
  const offers = candidates.filter((c) => c.command.type === "offer-diplomacy");
  const returns = candidates.filter(
    (c) => isOwn && c.command.type === "discard-reputation",
  );
  const factionOf = (id: string) =>
    getFaction(view.seats.find((s) => s.id === id)!.faction);
  const ambassador = (partnerId: string, ownerId: string) => {
    const partner = factionOf(partnerId),
      number = view.seats.findIndex((s) => s.id === partnerId) + 1;
    const cube = view.seats
      .find((s) => s.id === ownerId)
      ?.ambassadorResources?.find((a) => a.from === partnerId)?.resource;
    return (
      <div
        className="dg-ambassador-token"
        key={partnerId}
        aria-label={`${ownerId === view.viewerSeatId ? "Your ambassador" : "Ambassador"} from ${partner.name}`}
        style={{ "--diplomat-color": colors[partner.color] } as CSSProperties}
      >
        <svg viewBox="0 0 32 32" aria-hidden="true">
          <path
            d="M8 3h16v23l-8 4-8-4Z"
            fill="currentColor"
            opacity=".2"
            stroke="currentColor"
          />
          <circle cx="16" cy="11" r="4" fill="currentColor" />
          <path
            d="M10 24v-3a6 6 0 0 1 12 0v3"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
        </svg>
        <div>
          <strong>
            Player {number} · {partner.name}
          </strong>
          <small>{cube ? `${names[cube]} population cube · ` : ""}1 VP</small>
        </div>
      </div>
    );
  };
  return (
    <div className="dg-diplomacy-panel">
      <p className="sd-eyebrow">DIPLOMACY & REPUTATION</p>
      <h1>
        {isOwn
          ? "Your diplomatic rack"
          : `${getFaction(own.faction).name} diplomatic rack`}
      </h1>
      <p className="dg-diplomacy-intro">
        Ambassadors are retained here beside your combat reputation. Each
        ambassador is worth 1 VP; your reputation values stay private.
      </p>
      {view.seats.length < 4 && (
        <p className="sd-callout">
          Ambassador exchanges are available in games with 4–6 players. Combat
          reputation is still available in this game.
        </p>
      )}
      <section
        className="dg-diplomatic-rack"
        aria-label={
          isOwn
            ? "Your diplomatic rack"
            : `${getFaction(own.faction).name} diplomatic rack`
        }
      >
        <div className="dg-rack-heading">
          <h2>Ambassadors</h2>
          <span>{own.ambassadors.length} / 3 retained</span>
        </div>
        <div className="dg-ambassador-row">
          {own.ambassadors.map((id) => ambassador(id, own.id))}
          {Array.from(
            { length: Math.max(0, 3 - own.ambassadors.length) },
            (_, i) => (
              <div key={`empty-${i}`} className="dg-ambassador-empty">
                Empty ambassador slot
              </div>
            ),
          )}
        </div>
        <p className="dg-rack-note">
          {dedicated
            ? "This faction has one dedicated ambassador space. Further ambassadors occupy shared reputation spaces."
            : "Ambassadors share space with reputation tiles on your faction’s track."}{" "}
          Exchanging ambassadors moves one population cube off each player’s
          track.
        </p>
        <div className="dg-rack-heading">
          <h2>Combat reputation</h2>
          <span>
            {retainedCount} / {capacity} available spaces
          </span>
        </div>
        <div className="dg-reputation-row">
          {isOwn
            ? view.private.reputation.map((vp, i) => (
                <div
                  key={i}
                  className="dg-reputation-token"
                  aria-label={`Your reputation: ${vp} VP`}
                >
                  <strong>{vp}</strong>
                  <small>VP</small>
                </div>
              ))
            : Array.from({ length: retainedCount }, (_, i) => (
                <div
                  key={i}
                  className="dg-reputation-back"
                  aria-label="Face-down reputation tile"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M12 2l8 5v10l-8 5-8-5V7Z M12 7l4 5-4 5-4-5Z"
                      fill="none"
                      stroke="currentColor"
                    />
                  </svg>
                </div>
              ))}
          {Array.from(
            { length: Math.max(0, capacity - retainedCount) },
            (_, i) => (
              <div
                key={`empty-${i}`}
                className="dg-reputation-empty"
                aria-label="Empty reputation space"
              >
                ·
              </div>
            ),
          )}
        </div>
        {returns.length > 0 && (
          <div className="dg-reputation-returns">
            <p>
              Return a reputation tile to free room for an ambassador. Its
              points are lost.
            </p>
            {returns.map((candidate, i) => (
              <button
                key={i}
                disabled={disabled}
                onClick={() => onSubmit(candidate.command)}
              >
                {candidate.label}
              </button>
            ))}
          </div>
        )}
        {own.traitor && (
          <p className="dg-traitor">
            Traitor card · −2 VP. The holder cannot form new diplomatic
            relations.
          </p>
        )}
      </section>
      {!isOwn && (()=>{
        const partnerOffers=offers.filter(candidate=>candidate.command.type==='offer-diplomacy'&&candidate.command.to===own.id);
        if(!partnerOffers.length)return null;
        const selectedResource=chosenResources[own.id];
        const chosen=partnerOffers.find(candidate=>candidate.command.type==='offer-diplomacy'&&candidate.command.resource===selectedResource);
        const faction=getFaction(own.faction);
        return <section className="dg-diplomacy-offer dg-inspected-offer" aria-label={`Offer diplomacy to ${faction.name}`}>
          <h2>Form a relation · 1 VP ambassador</h2>
          <p>Each civilization exchanges an ambassador and returns one population cube to its track. Choose your cube deliberately; inspecting this civilization sends nothing.</p>
          <div className="dg-diplomacy-cube-choices" role="group" aria-label={`Your population cube for ${faction.name}`}>
            {resources.map(resource=>{const candidate=partnerOffers.find(item=>item.command.type==='offer-diplomacy'&&item.command.resource===resource);const before=incomeForPopulationAway(viewer.populationTracks[resource]);const after=incomeForPopulationAway(Math.min(11,viewer.populationTracks[resource]+1));return <button key={resource} type="button" className={`dg-diplomacy-cube${selectedResource===resource?' is-selected':''}`} aria-label={candidate?`Choose ${resource} population for ${faction.name}`:`${names[resource]} population unavailable for ${faction.name}`} aria-pressed={selectedResource===resource} disabled={disabled||!candidate} onClick={()=>candidate&&setChosenResources(current=>({...current,[own.id]:resource}))}><TradeResourceIcon resource={resource}/><span><strong>{names[resource]}</strong><small>{candidate?`Income ${before} → ${after}`:'Unavailable'}</small></span></button>;})}
          </div>
          {chosen?.command.type==='offer-diplomacy'&&<button className="sd-primary" disabled={disabled} aria-label={`Offer ambassador exchange to ${faction.name}`} onClick={()=>onSubmit(chosen.command)}>Offer ambassador exchange</button>}
        </section>;
      })()}
      {isOwn && (
        <>
          <h2>Other civilizations</h2>
          <div className="dg-diplomacy-partners">
            {view.seats
              .filter((s) => s.id !== own.id)
              .map((seat) => {
                const faction = getFaction(seat.faction);
                const partnerOffers = offers.filter(
                  (c) =>
                    c.command.type === "offer-diplomacy" &&
                    c.command.to === seat.id,
                );
                const chosen =
                  partnerOffers.find(
                    (c) =>
                      c.command.type === "offer-diplomacy" &&
                      c.command.resource === chosenResources[seat.id],
                  ) ?? partnerOffers[0];
                const chosenOffer =
                  chosen?.command.type === "offer-diplomacy"
                    ? chosen.command
                    : null;
                const count =
                  view.hiddenTileCounts.find((h) => h.seatId === seat.id)
                    ?.reputation ?? 0;
                return (
                  <section
                    className="dg-diplomatic-rack dg-partner-rack"
                    key={seat.id}
                    aria-label={`${faction.name} diplomatic rack`}
                    style={
                      {
                        "--diplomat-color": colors[faction.color],
                      } as CSSProperties
                    }
                  >
                    <div className="dg-rack-heading">
                      <h3>
                        <span className="dg-diplomat-number">
                          {view.seats.findIndex((s) => s.id === seat.id) + 1}
                        </span>
                        {faction.name}
                      </h3>
                      {seat.traitor && (
                        <span className="dg-traitor">Traitor · −2 VP</span>
                      )}
                    </div>
                    <p>
                      {own.ambassadors.includes(seat.id)
                        ? "Ambassadors exchanged with you."
                        : "No diplomatic relation with you."}
                    </p>
                    <div className="dg-ambassador-row">
                      {seat.ambassadors.map((id) => ambassador(id, seat.id))}
                      {!seat.ambassadors.length && (
                        <small>No ambassadors retained.</small>
                      )}
                    </div>
                    <div className="dg-reputation-row">
                      {Array.from({ length: count }, (_, i) => (
                        <div
                          key={i}
                          className="dg-reputation-back"
                          aria-label="Face-down reputation tile"
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path
                              d="M12 2l8 5v10l-8 5-8-5V7Z M12 7l4 5-4 5-4-5Z"
                              fill="none"
                              stroke="currentColor"
                            />
                          </svg>
                        </div>
                      ))}
                      <small>
                        {count} private reputation{" "}
                        {count === 1 ? "tile" : "tiles"}
                      </small>
                    </div>
                    {chosenOffer && (
                      <div className="dg-diplomacy-offer">
                        <p>Choose the population cube each civilization returns to its population track.</p>
                        <div className="dg-diplomacy-cube-choices" role="group" aria-label={`Population cube to exchange with ${faction.name}`}>
                          {resources.map((resource) => {
                            const offer = partnerOffers.find((candidate) => candidate.command.type === "offer-diplomacy" && candidate.command.resource === resource);
                            const available = Boolean(offer);
                            const selected = chosenOffer.resource === resource;
                            const incomeBefore = incomeForPopulationAway(own.populationTracks[resource]);
                            const incomeAfter = incomeForPopulationAway(Math.min(11, own.populationTracks[resource] + 1));
                            const label = available
                              ? `Offer ${resource} population cube to ${faction.name}`
                              : `${names[resource]} population cube unavailable for exchange with ${faction.name}`;
                            return <button
                              key={resource}
                              className={`dg-diplomacy-cube${selected ? " is-selected" : ""}`}
                              type="button"
                              aria-label={label}
                              aria-pressed={selected}
                              disabled={disabled || !available}
                              onClick={() => available && setChosenResources((current) => ({ ...current, [seat.id]: resource }))}
                            >
                              <TradeResourceIcon resource={resource} />
                              <span><strong>{names[resource]}</strong><small>{available ? `Income ${incomeBefore} → ${incomeAfter}` : "No legal exchange with this cube"}</small></span>
                              {selected && <b aria-hidden="true">✓</b>}
                            </button>;
                          })}
                        </div>
                        <p className="dg-diplomacy-exchange" aria-live="polite" aria-label={`Your ${chosenOffer.resource} income: ${incomeForPopulationAway(own.populationTracks[chosenOffer.resource])} → ${incomeForPopulationAway(Math.min(11, own.populationTracks[chosenOffer.resource] + 1))}`}><TradeResourceIcon resource={chosenOffer.resource} /> Your {chosenOffer.resource} income: {incomeForPopulationAway(own.populationTracks[chosenOffer.resource])} → {incomeForPopulationAway(Math.min(11, own.populationTracks[chosenOffer.resource] + 1))}. Exchange ambassadors.</p>
                        <button
                          className="sd-primary"
                          disabled={disabled}
                          onClick={() => onSubmit(chosenOffer)}
                          aria-label={`Offer ambassador exchange to ${faction.name}`}
                        >
                          Offer ambassador exchange
                        </button>
                      </div>
                    )}
                  </section>
                );
              })}
          </div>
        </>
      )}
      {isOwn && offers.length === 0 && view.seats.length >= 4 && (
        <p className="dg-rack-note">
          No ambassador exchange is currently available. Both players need
          connected controlled sectors, room on their tracks, an available
          population cube, and no shared or hostile occupied sectors. A traitor
          cannot exchange ambassadors. Complete any outstanding decision first.
        </p>
      )}
      <p className="dg-rack-note">
        Ending your action with ships in a diplomatic partner’s territory or a
        sector containing their ships breaks that relation and gives you the
        traitor card. You may pass through while unpinned and leave before
        ending the action. Both ambassadors and population cubes are returned
        through the game’s choices. The card remains with its holder until
        another player breaks a diplomatic relation and takes it; it does not
        reset each round.
      </p>
    </div>
  );
}
