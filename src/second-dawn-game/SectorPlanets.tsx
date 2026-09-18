import { getFaction } from "../../shared/eclipse/catalog";
import type { PlayerView, Resource, Sector } from "../../shared/eclipse/types";
import { sectorDefinition } from "../../shared/eclipse/sectors";
import type { CommandCandidate } from "./SecondDawnBoard";
import "./sectorPlanets.css";
const PLANET_NAMES = {
  money: "Money",
  science: "Science",
  materials: "Materials",
  gray: "Any resource",
  orbital: "Orbital",
};
const PLANET_COLORS = {
  money: "#e7bd67",
  science: "#b397da",
  materials: "#b89675",
  gray: "#b5c3cd",
  orbital: "#b5c3cd",
};
export type PlanetResource = Resource | "gray" | "orbital";
/** SVG paths can be reused inside map tokens and inspector icons. */
export function PlanetIcon({ resource }: { resource: PlanetResource }) {
  return (
    <g
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {resource === "money" ? (
        <>
          <circle cx="10" cy="10" r="7" />
          <path d="M10 5v10 M13 7H9a2 2 0 0 0 0 4h2a2 2 0 0 1 0 4H7" />
        </>
      ) : resource === "science" ? (
        <>
          <path d="M7 3h6 M8 3v6l-5 7q-1 2 2 2h10q3 0 2-2l-5-7V3 M6 12h8" />
        </>
      ) : resource === "materials" ? (
        <path d="M5 5h10l3 10H2Z M5 5l3 10 M15 5l-3 10 M3 12h14" />
      ) : resource === "orbital" ? (
        <>
          <circle cx="10" cy="10" r="5" />
          <ellipse cx="10" cy="10" rx="9" ry="3" />
        </>
      ) : (
        <>
          <path d="M10 2l8 8-8 8-8-8Z M6 10h8 M10 6v8" />
        </>
      )}
    </g>
  );
}
interface Props {
  sector: Sector;
  view: PlayerView;
  candidates: CommandCandidate[];
}
const resources: Resource[] = ["money", "science", "materials"];
const advancedNames = {
  money: "Advanced Economy",
  science: "Advanced Labs",
  materials: "Advanced Mining",
};
const advancedIds = {
  money: "advanced-economy",
  science: "advanced-labs",
  materials: "advanced-mining",
};
export default function SectorPlanets({ sector, view, candidates }: Props) {
  const definition = sectorDefinition(Number(sector.tileId))!;
  const own = view.seats.find((s) => s.id === view.viewerSeatId)!;
  const owned = sector.owner === own.id;
  const owner = view.seats.find((seat) => seat.id === sector.owner);
  const playerColors = {
    red: "#e99b9b",
    blue: "#88cde7",
    green: "#8bd4ad",
    yellow: "#efd27b",
    white: "#e3e7ed",
    black: "#bac0ce",
  };
  const cubeColor = owner
    ? playerColors[getFaction(owner.faction).color]
    : "#c4cbd1";
  const technologies = Object.values(own.technologies).flat();
  const squares: { id: string; resource: PlanetResource; advanced: boolean }[] =
    definition.population.map((square, i) => ({ id: `p${i}`, ...square }));
  if (sector.orbital)
    squares.push({ id: "orbital", resource: "orbital", advanced: false });
  const entries = squares.map((square) => {
    const cube = sector.population.find((p) => p.squareId === square.id);
    const choices =
      square.resource === "gray"
        ? resources
        : square.resource === "orbital"
          ? resources.slice(0, 2)
          : [square.resource];
    const legal = [
      ...new Set(
        candidates.flatMap((c) =>
          c.command.type === "colonize"
            ? c.command.placements
                .filter(
                  (p) => p.sectorId === sector.id && p.squareId === square.id,
                )
                .map((p) => p.resource)
            : [],
        ),
      ),
    ];
    const unlocked = choices.filter(
      (resource) =>
        !square.advanced ||
        technologies.includes(advancedIds[resource]) ||
        technologies.includes("metasynthesis"),
    );
    const requirement = square.advanced
      ? square.resource === "gray"
        ? "Requires the chosen resource’s advanced technology, or Metasynthesis."
        : `Requires ${advancedNames[square.resource as Resource]}, or Metasynthesis.`
      : null;
    const eligibility =
      !owned || cube
        ? null
        : legal.length
          ? `Can colonize: ${legal.map((r) => PLANET_NAMES[r]).join(" / ")} · 1 colony ship`
          : !unlocked.length
            ? "Research required before colonizing."
            : own.colonyShipsAvailable === 0
              ? "No colony ship available."
              : unlocked.every((r) => own.populationTracks[r] >= 11)
                ? "No matching population cube remains."
                : view.activeSeatId !== own.id
                  ? "Colonize during your turn or upkeep."
                  : "Colonization is unavailable during the current phase or decision.";
    return { square, cube, requirement, eligibility, legal };
  });
  return (
    <section
      className="dg-sector-planets"
      aria-label="Sector planets and features"
    >
      <h3>Planets & population</h3>
      {squares.length === 0 && <p>No population squares on this sector.</p>}
      <div className="dg-planet-list">
        {entries.map(({ square, cube, requirement, eligibility }) => (
          <div
            className="dg-planet-row"
            key={square.id}
            data-planet-square={square.id}
            style={{ color: PLANET_COLORS[square.resource] }}
            title={[
              `${PLANET_NAMES[square.resource]}${square.advanced ? " advanced" : ""} planet. ${cube ? `Occupied by a ${PLANET_NAMES[cube.resource]} cube.` : "Empty population square."}`,
              requirement,
              eligibility,
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <span className="dg-planet-orb">
              <svg viewBox="0 0 32 32" aria-hidden="true">
                <circle
                  cx="16"
                  cy="16"
                  r="15"
                  fill="currentColor"
                  opacity=".17"
                />
                <circle
                  cx="16"
                  cy="16"
                  r="14"
                  fill="none"
                  stroke="currentColor"
                  opacity=".55"
                />
                <g transform="translate(5 5) scale(1.1)">
                  <PlanetIcon resource={square.resource} />
                </g>
              </svg>
              {square.advanced && (
                <svg
                  className="dg-planet-advanced"
                  viewBox="0 0 16 16"
                  role="img"
                  aria-label="Advanced planet"
                >
                  <path
                    d="M8 1l2 4 5 .7-3.5 3.4.8 4.9L8 11.7 3.7 14l.8-4.9L1 5.7 6 5Z"
                    fill="#e6ce91"
                    stroke="#121b24"
                    strokeWidth="1"
                  />
                </svg>
              )}
            </span>
            <div className="dg-planet-caption">
              <strong>{PLANET_NAMES[square.resource]}</strong>
              <svg
                className="dg-population-cube"
                viewBox="0 0 20 20"
                role="img"
                aria-label={
                  cube
                    ? `Occupied · ${PLANET_NAMES[cube.resource]} cube`
                    : "Empty population square"
                }
              >
                {cube ? (
                  <>
                    <path
                      d="M3 6L10 2l7 4v8l-7 4-7-4Z"
                      fill={cubeColor}
                      stroke="#f3efe0"
                      strokeWidth=".8"
                    />
                    <path
                      d="M3 6l7 4 7-4 M10 10v8"
                      fill="none"
                      stroke="#12202c"
                      strokeWidth=".9"
                    />
                    <path d="M3 6l7-4 7 4-7 4Z" fill="#fff" opacity=".24" />
                  </>
                ) : (
                  <rect
                    x="4"
                    y="4"
                    width="12"
                    height="12"
                    rx="1"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.3"
                  />
                )}
              </svg>
            </div>
          </div>
        ))}
      </div>
      {squares.length > 0 && (
        <div className="dg-planet-legend">
          <span>
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path
                d="M2 5l6-3 6 3v7l-6 3-6-3Z M2 5l6 3 6-3 M8 8v7"
                fill={cubeColor}
                stroke="#151e27"
              />
            </svg>
            Population
          </span>
          <span>
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <rect
                x="3"
                y="3"
                width="10"
                height="10"
                fill="none"
                stroke="currentColor"
              />
            </svg>
            Uncolonized
          </span>
          <span>
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path
                d="M8 1l2 4 5 .7-3.5 3.4.8 4.9L8 11.7 3.7 14l.8-4.9L1 5.7 6 5Z"
                fill="#e6ce91"
              />
            </svg>
            Advanced
          </span>
        </div>
      )}
      {squares.length > 0 && (
        <details className="dg-colonization-details">
          <summary>Colonization requirements</summary>
          {entries.map(({ square, requirement, eligibility }) => (
            <div key={square.id}>
              <strong>
                {PLANET_NAMES[square.resource]}
                {square.advanced ? " · Advanced" : ""}
              </strong>
              {square.resource === "gray" && (
                <p>Choose Money, Science or Materials.</p>
              )}
              {square.resource === "orbital" && <p>Choose Money or Science.</p>}
              {requirement && <p>{requirement}</p>}
              {eligibility && <p>{eligibility}</p>}
              {!requirement && !eligibility && (
                <p>
                  {owned
                    ? "Use one colony ship and a matching population cube for an empty square."
                    : "Only this sector’s controller can colonize its empty squares."}
                </p>
              )}
            </div>
          ))}
        </details>
      )}
      <h3>Sector features</h3>
      <dl className="dg-sector-facts">
        <div>
          <dt>Control value</dt>
          <dd>{definition.victoryPoints} VP</dd>
        </div>
        <div>
          <dt>Artifacts</dt>
          <dd>{definition.artifacts}</dd>
        </div>
      </dl>
      {definition.artifacts > 0 && (
        <p className="dg-feature-note">
          Artifact Key grants resources for your controlled artifacts when
          researched.
        </p>
      )}
      {sector.monolith && (
        <p className="dg-feature-note">
          <strong>Monolith</strong> · 3 VP while you control this sector.
        </p>
      )}
      {sector.discovery && (
        <p className="dg-feature-note">
          <strong>Discovery tile</strong> · Resolve its reward after defending
          ships are cleared.
        </p>
      )}
      {(sector.portalVp !== undefined || definition.warpPortal) && (
        <p className="dg-feature-note">
          <strong>Warp portal</strong> · Connects to every other warp portal
          regardless of distance.
          {sector.portalVp !== undefined && sector.portalVp > 0
            ? ` Worth ${sector.portalVp} additional VP while controlled.`
            : ""}
        </p>
      )}
    </section>
  );
}
