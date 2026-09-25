import type {GameRuleOptions} from '../../shared/eclipse/gameRules';
import {useRef,type CSSProperties} from "react";
import {useMobileLayout} from "./mobileLayout";
import { BASE_FACTIONS, getFaction, listFactionsForProfile, type FactionProfile, type CivilizationColor, type FactionId } from "../../shared/eclipse/catalog";
import { TECHNOLOGIES } from "../../shared/eclipse/technologies";
import TechnologyStats from "./TechnologyStats";
import { StatIcon } from "./ShipPartStats";
import { TradeResourceIcon } from "./TradePanel";
import { describeTechnology } from "./itemDescriptions";
import { factionPresentation } from "./factionPresentation";
import type {RulesMode} from '../../shared/eclipse/types';
import "./factionPicker.css";
import FactionSymbol from "./FactionSymbol";

export type UnavailableFactionColors = Partial<Record<CivilizationColor, string>>;
export interface FactionPickerProps {
  selected: FactionId;
  profile?: FactionProfile;
  rulesMode?: RulesMode;
  ruleOptions?: GameRuleOptions;
  unavailableFactions?: Partial<Record<FactionId,string>>;
  pieceColor?: CivilizationColor;
  onPieceColorChange?: (color:CivilizationColor)=>void;
  onSelect: (faction: FactionId) => void;
  disabled?: boolean;
  unavailableColors?: UnavailableFactionColors;
}
const colors: readonly CivilizationColor[] = ["red", "blue", "green", "yellow", "white", "black"];
const boardColors: Record<CivilizationColor, string> = {
  red: "#df7e86",
  blue: "#70c8e3",
  green: "#79c9a0",
  yellow: "#e8c766",
  white: "#e3e7ed",
  black: "#a4acba",
};
const resourceNames = { money: "Money", science: "Science", materials: "Materials" } as const;

function Resources({ faction }: { faction: (typeof BASE_FACTIONS)[number] }) {
  return <div className="dg-faction-resources" aria-label={`Starting resources: ${faction.startingResources.money} money, ${faction.startingResources.science} science, ${faction.startingResources.materials} materials`}>
    {(["money", "science", "materials"] as const).map(resource => <span key={resource}><TradeResourceIcon resource={resource}/><b>{faction.startingResources[resource]}</b><small>{resourceNames[resource]}</small></span>)}
  </div>;
}

export default function FactionPicker({ selected, onSelect, disabled = false, unavailableColors = {}, profile="base", rulesMode, ruleOptions, unavailableFactions={}, pieceColor, onPieceColorChange }: FactionPickerProps) {
  const compact=useMobileLayout();
  const picker=useRef<HTMLElement>(null),detail=useRef<HTMLElement>(null);
  function showDetails(){detail.current?.scrollIntoView({block:'start'});detail.current?.focus({preventScroll:true});}
  const active = getFaction(selected);
  const expanded=profile!=='base';
  const presentation = factionPresentation(selected,{rulesMode,ruleOptions});
  const technologies = active.startingTechnologies.flatMap(id => TECHNOLOGIES.filter(technology => technology.id === id));
  return <section ref={picker} tabIndex={-1} className="dg-faction-picker" aria-label="Choose civilization">
    <header><div><small>YOUR CIVILIZATION</small><h2>Choose a faction board</h2></div><p>{expanded?"Choose your civilization, then your pieces. Each faction and piece color can only be used once.":"Each color has an alien and Terran side. A color can only be used once."}</p></header>
    {compact&&<button type="button" className="dg-faction-jump" onClick={showDetails}>View {active.name} effects</button>}
    {expanded?<div className="dg-expanded-factions" role="group" aria-label="Expanded civilizations">{listFactionsForProfile(profile).map(faction=>{const unavailable=unavailableFactions[faction.id];const effect=factionPresentation(faction.id,{rulesMode,ruleOptions}).benefits[0];return <button key={faction.id} type="button" aria-pressed={selected===faction.id} aria-label={`${faction.name}${unavailable?`. ${unavailable}`:''}`} disabled={disabled||!!unavailable} onClick={()=>{onSelect(faction.id);if(compact)requestAnimationFrame(showDetails);}}><FactionSymbol faction={faction.id}/><strong>{faction.name}</strong><small>{unavailable??`${effect.value??''} ${effect.label}`}</small></button>;})}</div>:<div className="dg-faction-pairs">
      {colors.map(color => {
        const pair = BASE_FACTIONS.filter(faction => faction.color === color);
        const unavailable = unavailableColors[color];
        return <section key={color} className={`dg-faction-pair dg-faction-${color}`} aria-label={`${color[0].toUpperCase() + color.slice(1)} civilization board`}>
          <span className="dg-faction-color" aria-hidden="true" />
          <div>{pair.map(faction => <button key={faction.id} type="button" aria-label={`${faction.name}, ${color[0].toUpperCase() + color.slice(1)} board${unavailable ? `. ${unavailable}` : ""}`} aria-pressed={selected === faction.id} disabled={disabled || !!unavailable} onClick={() => {onSelect(faction.id);if(compact)requestAnimationFrame(showDetails);}}><FactionSymbol faction={faction.id}/><strong>{faction.name}</strong><small>{faction.species === "alien" ? "Alien side" : "Terran side"}</small></button>)}</div>
          {unavailable && <small className="dg-faction-unavailable">{unavailable}</small>}
        </section>;
      })}
    </div>}
    {expanded&&onPieceColorChange&&<fieldset className="dg-piece-colors"><legend>Your pieces</legend><p>Color marks your ships and territory. Your faction keeps its own emblem.</p><div>{colors.map(color=><button type="button" key={color} aria-label={`${color[0].toUpperCase()+color.slice(1)} pieces${unavailableColors[color]?`. ${unavailableColors[color]}`:''}`} aria-pressed={pieceColor===color} disabled={disabled||!!unavailableColors[color]} onClick={()=>onPieceColorChange(color)} style={{'--piece-color':boardColors[color]} as CSSProperties}><span aria-hidden="true"/>{color[0].toUpperCase()+color.slice(1)}{pieceColor===color?' ✓':''}</button>)}</div></fieldset>}
    <article ref={detail} tabIndex={-1} className="dg-faction-detail" style={{ "--faction-color": boardColors[active.color] } as CSSProperties} aria-label={`${active.name} details`}>
      {compact&&<button type="button" className="dg-faction-jump" onClick={()=>{picker.current?.scrollIntoView({block:"start"});picker.current?.focus({preventScroll:true});}}>Compare factions</button>}
      <header><div><span className="dg-faction-detail-mark"><FactionSymbol faction={active.id}/></span><div><small>{active.species === "alien" ? "ALIEN SIDE" : "TERRAN SIDE"} · HOME {active.homeSector}</small><h3>{active.name}</h3></div></div><Resources faction={active}/></header>
      <p className="dg-faction-overview">{presentation.overview}</p>
      <div className="dg-faction-effects">{presentation.benefits.map(effect => <div key={effect.label} aria-label={`${effect.value ? `${effect.value} ` : ""}${effect.label}`}><StatIcon kind={effect.icon}/><span>{effect.value && <b className="dg-faction-effect-value">{effect.value}</b>}<strong>{effect.label}</strong><small>{effect.detail}</small></span></div>)}</div>
      <div className="dg-faction-setup"><span><StatIcon kind="population"/><b>{active.colonyShips}</b><small>colony ships</small></span><span><StatIcon kind="influence"/><b>{active.startingInfluenceDiscs - 1}</b><small>discs on track</small></span><span><StatIcon kind="initiative"/><b>{active.startingShips?.[active.startingShip]??1} {presentation.startingShip}</b><small>{presentation.blueprintSummary}</small></span></div>
      <section className="dg-faction-tech"><h4>Starting technologies</h4>{technologies.map(technology => <div key={technology.id}><strong>{technology.name}</strong><TechnologyStats technology={technology}/><small>{describeTechnology(technology)}</small></div>)}</section>
      <section className="dg-faction-constraints"><h4>Know before choosing</h4><ul>{presentation.constraints.map(constraint => <li key={constraint}>{constraint}</li>)}</ul></section>
    </article>
  </section>;
}
