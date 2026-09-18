import { useState } from 'react';
import type { CSSProperties } from 'react';
import { players, sectorsFor } from './fixtures';
import type { FixtureStage, PrototypeSector } from './fixtures';
import './second-dawn.css';
import { TECHNOLOGIES, getTechnology } from '../../shared/eclipse/technologies';

type Screen = 'Galaxy' | 'Research' | 'Blueprints' | 'Combat' | 'Scoring';
const hex = Array.from(
  { length: 6 },
  (_, i) =>
    `${51 * Math.cos(((30 + i * 60) * Math.PI) / 180)},${51 * Math.sin(((30 + i * 60) * Math.PI) / 180)}`,
).join(' ');
function Ship({
  large = false,
  cruiser = false,
}: {
  large?: boolean;
  cruiser?: boolean;
}) {
  return (
    <svg
      aria-hidden="true"
      width={large ? 170 : 22}
      height={large ? 120 : 18}
      viewBox="0 0 100 70"
    >
      <path
        d={
          cruiser
            ? 'M50 3 65 20 65 35 82 25 91 58 63 51 63 65 37 65 37 51 9 58 18 25 35 35 35 20Z'
            : 'M50 4 63 32 87 48 90 61 60 51 50 64 40 51 10 61 13 48 37 32Z'
        }
        fill="currentColor"
        opacity=".75"
      />
      <path
        d="m50 14 0 38M26 48l17-8m31 8L57 40"
        stroke="var(--sd-bg)"
        strokeWidth="3"
      />
    </svg>
  );
}
export default function SecondDawnPrototype() {
  const [stage, setStage] = useState<FixtureStage>('Opening');
  const [screen, setScreen] = useState<Screen>('Galaxy');
  const [selected, setSelected] = useState<PrototypeSector | null>(null);
  const [zoom, setZoom] = useState(1.6);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [action, setAction] = useState('Explore');
  const [draft, setDraft] = useState('Ion cannon');
  const [installed, setInstalled] = useState('Ion cannon');
  const [hits, setHits] = useState(0);
  const [status, setStatus] = useState('Select a sector to inspect it.');
  const [technology, setTechnology] = useState(getTechnology('improved-hull'));
  const sectors = sectorsFor(stage);
  const round = stage === 'Opening' ? 1 : stage === 'Midgame' ? 4 : 8;
  return (
    <main className="sd-app">
      <div className="sd-prototype">
        Visual prototype · deterministic illustrative fixtures · changes are not
        saved <a href="#">Return to menu</a>
      </div>
      <header className="sd-header">
        <div className="sd-brand">
          <span className="sd-eclipse" />
          <div>
            <strong>ECLIPSE</strong>
            <small>SECOND DAWN FOR THE GALAXY</small>
          </div>
        </div>
        <div className="sd-turn">
          <small>ROUND {round} / 8</small>
          <strong>
            {screen === 'Scoring'
              ? 'Game over · final results'
              : screen === 'Combat'
                ? 'Combat · your decision'
                : 'Action phase · your turn'}
          </strong>
        </div>
        <div className="sd-resource">
          <small>Money</small>
          <strong>
            12 <em>+8 income</em>
          </strong>
        </div>
        <div className="sd-resource">
          <small>Science</small>
          <strong>
            9 <em>+5 income</em>
          </strong>
        </div>
        <div className="sd-resource">
          <small>Materials</small>
          <strong>
            14 <em>+6 income</em>
          </strong>
        </div>
        <div className="sd-upkeep">
          <small>Projected upkeep</small>
          <strong>
            −7 <span>13 remaining</span>
          </strong>
        </div>
      </header>
      <div className="sd-toolbar">
        <nav aria-label="Game screens">
          {(
            [
              'Galaxy',
              'Research',
              'Blueprints',
              'Combat',
              'Scoring',
            ] as Screen[]
          ).map((name) => (
            <button
              key={name}
              aria-pressed={screen === name}
              onClick={() => {
                setScreen(name);
                setStatus(name === 'Scoring'
                  ? 'Review the illustrative final scoring categories.'
                  : name === 'Galaxy'
                    ? 'Select a sector to inspect it.'
                    : `Inspect the ${name.toLowerCase()} fixture.`);
              }}
            >
              {name}
            </button>
          ))}
        </nav>
        <div className="sd-fixtures" aria-label="Visual fixtures">
          {(['Opening', 'Midgame', 'Late game'] as FixtureStage[]).map(
            (name) => (
              <button
                key={name}
                aria-pressed={stage === name}
                onClick={() => {
                  setStage(name);
                  setSelected(null);
                  setZoom(name === 'Opening' ? 1.6 : 1);
                  setPan({ x: 0, y: 0 });
                }}
              >
                {name}
              </button>
            ),
          )}
        </div>
      </div>
      <div className="sd-layout">
        <aside className="sd-players">
          <p className="sd-eyebrow">THE GALAXY</p>
          <h2>
            Six civilizations.
            <br />
            One second dawn.
          </h2>
          <div
            className="sd-player-list"
            tabIndex={0}
            role="region"
            aria-label="Civilization roster"
          >
            {players.map((p, i) => (
              <div
                className={`sd-player ${i === 0 ? 'sd-active' : ''}`}
                key={p.name}
                style={{ '--owner': p.color } as CSSProperties}
              >
                <span className="sd-owner">{p.mark}</span>
                <div>
                  <strong>{p.name}</strong>
                  <small>
                    {screen === 'Scoring'
                      ? `${i === 0 ? 'You' : `AI ${i}`} · finished`
                      : i === 0
                      ? 'You · choosing an action'
                      : `AI ${i} · ${i === 2 ? 'passed' : 'waiting'}`}
                  </small>
                </div>
              </div>
            ))}
          </div>
          <div className="sd-note">
            <small>YOUR NEXT DECISION</small>
            <p>
              {screen === 'Combat'
                ? 'Assign two hits, then confirm or inspect a retreat.'
                : screen === 'Research'
                  ? 'Select a technology to inspect its role.'
                  : screen === 'Blueprints'
                    ? 'Select a weapon, compare your draft, then confirm.'
                    : screen === 'Scoring'
                      ? 'Compare each civilization’s scoring categories.'
                      : action === 'Explore'
                        ? 'Choose a highlighted frontier to preview exploration.'
                        : `Review ${action.toLowerCase()} targets and costs before committing.`}
            </p>
          </div>
          <label className="sd-animation">
            <input type="checkbox" defaultChecked /> Skip animations
          </label>
        </aside>
        <section className="sd-main" aria-label={`${screen} workspace`}>
          {screen === 'Galaxy' && (
            <>
              <div className="sd-map-heading">
                <div>
                  <p className="sd-eyebrow">{stage.toUpperCase()} FIXTURE</p>
                  <h1>A galaxy of possibilities</h1>
                </div>
                <span>{sectors.length} sectors</span>
              </div>
              <div
                className="sd-map"
                onWheel={(event) =>
                  setZoom((z) =>
                    Math.max(
                      0.7,
                      Math.min(2, z + (event.deltaY < 0 ? 0.1 : -0.1)),
                    ),
                  )
                }
              >
                <svg
                  viewBox="-365 -310 730 620"
                  role="group"
                  aria-label="Galaxy sector map"
                >
                  <defs>
                    <radialGradient id="sd-sector">
                      <stop stopColor="#172c41" />
                      <stop offset="1" stopColor="#0b1827" />
                    </radialGradient>
                  </defs>
                  <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
                    {sectors.map((s) => {
                      const x = Math.sqrt(3) * 54 * (s.q + s.r / 2),
                        y = 81 * s.r,
                        p = players[s.owner],
                        isSelected = selected?.id === s.id;
                      return (
                        <g
                          key={s.id}
                          transform={`translate(${x} ${y})`}
                          role="button"
                          tabIndex={0}
                          aria-label={`Inspect sector ${s.id}, ${p.name}, ${s.ships} ships`}
                          onClick={() => setSelected(s)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setSelected(s);
                            }
                          }}
                          className="sd-sector"
                        >
                          <polygon
                            points={hex}
                            fill="url(#sd-sector)"
                            stroke={isSelected ? '#fff3c8' : p.color}
                            strokeOpacity={isSelected ? 1 : 0.55}
                            strokeWidth={isSelected ? 3 : 1}
                          />
                          <path
                            d="M-13-46h26M35 25l-12 7"
                            stroke={p.color}
                            strokeWidth="4"
                          />
                          <text
                            y="-25"
                            textAnchor="middle"
                            fill={p.color}
                            fontSize="18"
                          >
                            {p.mark}
                            {zoom > 1.2 ? ` · ${s.id}` : ''}
                          </text>
                          <circle
                            r={s.population === 3 ? 12 : 8}
                            fill={p.color}
                            opacity=".75"
                          />
                          <circle
                            cx="-3"
                            cy="-3"
                            r="4"
                            fill="#fff"
                            opacity=".12"
                          />
                          {s.ships > 0 && (
                            <text
                              y="27"
                              textAnchor="middle"
                              fill="#dbe7f1"
                              fontSize="17"
                            >
                              ▲ {s.ships}
                              {s.structure ? '  ◇' : ''}
                            </text>
                          )}
                          {zoom > 1.2 && (
                            <text
                              y="40"
                              textAnchor="middle"
                              fill="#b3c1d0"
                              fontSize="10"
                            >
                              Pop {s.population}
                            </text>
                          )}
                          {s.id === 117 && stage !== 'Opening' && (
                            <g aria-label="Pending battle in sector 117">
                              <circle
                                r="18"
                                fill="none"
                                stroke="#ed9093"
                                strokeDasharray="3 3"
                              />
                              <text x="22" y="12" fill="#ed9093" fontSize="16">
                                ▲
                              </text>
                            </g>
                          )}
                          {s.discovery && (
                            <circle
                              cx="24"
                              cy="-7"
                              r="4"
                              stroke="#f2d398"
                              fill="none"
                            />
                          )}
                        </g>
                      );
                    })}
                    {action === 'Explore' && (
                      <g
                        className="sd-frontier"
                        role="button"
                        tabIndex={0}
                        aria-label="Preview highlighted exploration frontier"
                        transform={
                          stage === 'Opening'
                            ? 'translate(150 -90)'
                            : 'translate(280 -170)'
                        }
                        onClick={() =>
                          setStatus(
                            'Illustrative frontier selected. Exploration costs one action disc; a real sector draw is not implemented.',
                          )
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter')
                            setStatus(
                              'Illustrative frontier selected. Exploration costs one action disc; a real sector draw is not implemented.',
                            );
                        }}
                      >
                        <polygon
                          points={hex}
                          fill="#193534"
                          stroke="#8aceb4"
                          strokeDasharray="5 5"
                        />
                        <text
                          textAnchor="middle"
                          y="-2"
                          fill="#a4e8c7"
                          fontSize="20"
                        >
                          +
                        </text>
                        <text
                          textAnchor="middle"
                          y="18"
                          fill="#a4e8c7"
                          fontSize="10"
                        >
                          EXPLORE
                        </text>
                      </g>
                    )}
                  </g>
                </svg>
                <div className="sd-map-controls">
                  <button
                    aria-label="Zoom out"
                    onClick={() => setZoom((z) => Math.max(0.7, z - 0.2))}
                  >
                    −
                  </button>
                  <span>{Math.round(zoom * 100)}%</span>
                  <button
                    aria-label="Zoom in"
                    onClick={() => setZoom((z) => Math.min(2, z + 0.2))}
                  >
                    +
                  </button>
                  <button
                    onClick={() => {
                      setZoom(stage === 'Opening' ? 1.6 : 1);
                      setPan({ x: 0, y: 0 });
                    }}
                  >
                    Fit
                  </button>
                  <button
                    aria-label="Pan left"
                    onClick={() => setPan((p) => ({ ...p, x: p.x - 70 }))}
                  >
                    ←
                  </button>
                  <button
                    aria-label="Pan right"
                    onClick={() => setPan((p) => ({ ...p, x: p.x + 70 }))}
                  >
                    →
                  </button>
                  <button
                    aria-label="Pan up"
                    onClick={() => setPan((p) => ({ ...p, y: p.y - 70 }))}
                  >
                    ↑
                  </button>
                  <button
                    aria-label="Pan down"
                    onClick={() => setPan((p) => ({ ...p, y: p.y + 70 }))}
                  >
                    ↓
                  </button>
                </div>
              </div>
            </>
          )}
          {screen === 'Research' && (
            <div className="sd-workspace">
              <p className="sd-eyebrow">TECHNOLOGY MARKET · ILLUSTRATIVE</p>
              <h1>Invest in your next advantage.</h1>
              <p className="sd-muted">
                Select a technology to compare its role. Catalog costs shown;
                actual discounts and market availability need match integration.
              </p>
              <div className="sd-tech-grid">
                {['Military', 'Grid', 'Nano'].map((track) => (
                  <section key={track}>
                    <h2>{track}</h2>
                    {TECHNOLOGIES.filter((t) => t.track === track.toLowerCase())
                      .slice(0, 3)
                      .map((item, j) => (
                        <button
                          className="sd-tech"
                          key={item.id}
                          aria-pressed={technology.id === item.id}
                          onClick={() => setTechnology(item)}
                        >
                          <span className="sd-tech-symbol">
                            {['✦', '◇', '⊙'][j]}
                          </span>
                          <strong>{item.name}</strong>
                          <small>
                            {item.baseCost} science · minimum {item.minimumCost}
                          </small>
                        </button>
                      ))}
                  </section>
                ))}
              </div>
            </div>
          )}
          {screen === 'Blueprints' && (
            <div className="sd-workspace">
              <p className="sd-eyebrow">SHIP DESIGN · EDITABLE DRAFT</p>
              <h1>Make every slot count.</h1>
              <div className="sd-ship-preview">
                <Ship large />
                <div>
                  <h2>Interceptor</h2>
                  <p>Installed: {installed}</p>
                  <strong>Draft: {draft}</strong>
                </div>
              </div>
              <h2>Weapon slot</h2>
              <div className="sd-parts">
                {['Ion cannon', 'Plasma cannon'].map((part) => (
                  <button
                    key={part}
                    aria-label={`Select ${part}`}
                    aria-pressed={draft === part}
                    onClick={() => setDraft(part)}
                  >
                    <span className="sd-tech-symbol">✦</span>
                    <strong>{part}</strong>
                    <small>
                      {part === 'Ion cannon'
                        ? 'Standard weapon'
                        : 'Research required in a real match'}
                    </small>
                  </button>
                ))}
              </div>
              <div className="sd-callout">
                This editor demonstrates a draft and confirmation. Energy,
                technology ownership, and faction legality await engine
                integration.
              </div>
              <button
                className="sd-primary"
                onClick={() => {
                  setInstalled(draft);
                  setStatus(
                    'Prototype blueprint updated. This is an unsaved visual draft.',
                  );
                }}
              >
                Confirm prototype upgrade
              </button>
              <button onClick={() => setDraft(installed)}>Reset draft</button>
            </div>
          )}
          {screen === 'Combat' && (
            <div className="sd-workspace">
              <p className="sd-eyebrow">SECTOR 117 · COMBAT DECISION FIXTURE</p>
              <h1>Your volley. Your decision.</h1>
              <p className="sd-muted">
                Assign the two illustrative hits. Review the allocation before
                confirming.
              </p>
              <div className="sd-battle">
                <div>
                  <span className="sd-owner">I</span>
                  <h2>Your interceptor</h2>
                  <Ship large />
                  <p>2 hits available</p>
                </div>
                <span className="sd-versus">VS</span>
                <div>
                  <span className="sd-owner">III</span>
                  <h2>Enemy cruiser</h2>
                  <Ship large cruiser />
                  <p>{hits} / 2 hits assigned</p>
                </div>
              </div>
              <div className="sd-hit-controls">
                <button
                  disabled={hits === 2}
                  onClick={() => setHits((h) => Math.min(2, h + 1))}
                >
                  Assign hit to enemy cruiser
                </button>
                <button
                  disabled={hits === 0}
                  onClick={() => setHits((h) => Math.max(0, h - 1))}
                >
                  Remove hit
                </button>
              </div>
              <button
                className="sd-primary"
                disabled={hits !== 2}
                onClick={() =>
                  setStatus(
                    'Prototype hit allocation confirmed. No real dice or combat state were changed.',
                  )
                }
              >
                Confirm hit allocation
              </button>
              <details>
                <summary>Review retreat</summary>
                <p>
                  Illustrative destination: sector 116. Real retreat timing and
                  destination legality require the rules engine.
                </p>
                <button
                  onClick={() =>
                    setStatus(
                      'Prototype retreat selected: sector 116. No match state changed.',
                    )
                  }
                >
                  Choose prototype retreat to sector 116
                </button>
              </details>
            </div>
          )}
          {screen === 'Scoring' && (
            <div className="sd-workspace">
              <p className="sd-eyebrow">FINAL SCORING · ILLUSTRATIVE VALUES</p>
              <h1>Every decision leaves a legacy.</h1>
              <p className="sd-muted">
                A transparent breakdown of the final tally. These are layout
                fixtures, not engine results.
              </p>
              <table className="sd-score">
                <thead>
                  <tr>
                    <th>Civilization</th>
                    <th>Sectors</th>
                    <th>Research</th>
                    <th>Reputation</th>
                    <th>Other</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {players.map((p, i) => (
                    <tr key={p.name}>
                      <th>
                        <span style={{ color: p.color }}>{p.mark}</span>{' '}
                        {p.name}
                      </th>
                      <td>{16 - i}</td>
                      <td>{6 - (i % 3)}</td>
                      <td>{8 - i}</td>
                      <td>4</td>
                      <td>
                        <strong>{34 - 2 * i - (i % 3)}</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="sd-callout">
                Other points will expand into discoveries, structures,
                ambassadors, faction points, and penalties when backed by
                authoritative scoring events.
              </div>
            </div>
          )}
        </section>
        <aside className="sd-inspector">
          <p className="sd-eyebrow">
            {screen === 'Galaxy' ? 'SECTOR INSPECTOR' : 'CONTEXT & COMPARISON'}
          </p>
          {screen === 'Galaxy' ? (
            selected ? (
              <>
                <h2>Sector {selected.id}</h2>
                <span
                  className="sd-badge"
                  style={{ color: players[selected.owner].color }}
                >
                  {players[selected.owner].mark} ·{' '}
                  {players[selected.owner].name}
                </span>
                <dl>
                  <dt>Fleet</dt>
                  <dd>{selected.ships} ships</dd>
                  <dt>Ship classes</dt>
                  <dd>
                    {selected.ships > 1
                      ? `1 cruiser, ${selected.ships - 1} interceptor${selected.ships > 2 ? 's' : ''}`
                      : selected.ships === 1
                        ? '1 interceptor'
                        : 'None'}
                  </dd>
                  <dt>Population</dt>
                  <dd>{selected.population} cubes</dd>
                  <dt>Structures</dt>
                  <dd>{selected.structure ?? 'None'}</dd>
                  <dt>Discovery</dt>
                  <dd>{selected.discovery ? 'Unclaimed marker' : 'None'}</dd>
                </dl>
                {selected.id === 117 && stage !== 'Opening' && (
                  <div className="sd-callout">
                    <strong>Pending battle</strong>
                    <p>Mixed fleets: Mechanema and Draco.</p>
                    <button onClick={() => setScreen('Combat')}>
                      Inspect combat decision
                    </button>
                  </div>
                )}
                <h3>Connections</h3>
                <p>
                  Two wormhole edges are marked on the tile. This fixture does
                  not calculate legal connections.
                </p>
                <h3>Movement preview</h3>
                <p>
                  Movement needs connected wormholes, sufficient range, and
                  unpinned ships. Legality will be supplied by the rules engine.
                </p>
              </>
            ) : (
              <>
                <h2>Read the galaxy.</h2>
                <p>
                  Select any sector to see its fleets, ownership, population,
                  and wormholes in one place.
                </p>
                <div className="sd-legend">
                  <span>Roman numeral</span>
                  <strong>Owner identity</strong>
                  <span>▲ and number</span>
                  <strong>Fleet count</strong>
                  <span>Hollow circle</span>
                  <strong>Discovery</strong>
                  <span>Edge bar</span>
                  <strong>Wormhole</strong>
                </div>
              </>
            )
          ) : screen === 'Research' ? (
            <>
              <h2>{technology.name}</h2>
              <p>Compare this technology with your current ships and plans.</p>
              <div className="sd-callout">
                Verified catalog: {technology.baseCost} science base cost;{' '}
                {technology.minimumCost} minimum. Track: {technology.track}.
                This fixture does not calculate your discount or affordability.
              </div>
            </>
          ) : screen === 'Blueprints' ? (
            <>
              <h2>Enemy comparison</h2>
              <p>Draco cruiser · public blueprint fixture</p>
              <dl>
                <dt>Weapon</dt>
                <dd>Ion cannon</dd>
                <dt>Drive</dt>
                <dd>Nuclear drive</dd>
                <dt>Defense</dt>
                <dd>Hull</dd>
              </dl>
              <p>Compare public equipment here without leaving your draft.</p>
            </>
          ) : screen === 'Combat' ? (
            <>
              <h2>Allocation preview</h2>
              <dl>
                <dt>Available</dt>
                <dd>2 hits</dd>
                <dt>Assigned</dt>
                <dd>{hits} hits</dd>
                <dt>Remaining</dt>
                <dd>{2 - hits} hits</dd>
              </dl>
              <p>
                All hits must be allocated before confirmation. You can revise
                this prototype allocation freely.
              </p>
            </>
          ) : (
            <>
              <h2>Score transparency</h2>
              <p>
                Selecting a score in the integrated game will show the exact
                sectors, technologies, and tokens that contributed.
              </p>
              <p>This screen demonstrates the comparison layout only.</p>
            </>
          )}
        </aside>
      </div>
      <footer className="sd-footer">
        <div className="sd-actions" aria-label="Action preview">
          {[
            'Explore',
            'Influence',
            'Research',
            'Upgrade',
            'Build',
            'Move',
            'Pass',
          ].map((a) => (
            <button
              key={a}
              disabled={screen === 'Scoring'}
              aria-pressed={screen !== 'Scoring' && action === a}
              onClick={() => {
                setAction(a);
                if (a === 'Research') setScreen('Research');
                else if (a === 'Upgrade') setScreen('Blueprints');
                else {
                  setScreen('Galaxy');
                  setStatus(
                    `${a} preview selected. Authoritative action execution is not available in this visual prototype.`,
                  );
                }
              }}
            >
              {a}
            </button>
          ))}
        </div>
        <div className="sd-status" role="status">
          {status}
        </div>
      </footer>
    </main>
  );
}
