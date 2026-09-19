import { getFaction, type FactionId } from "../../shared/eclipse/catalog";
import { blueprintDefinition } from "../../shared/eclipse/blueprints";
import type { StatIconName } from "./ShipPartStats";

export interface FactionEffect {
  icon: StatIconName;
  /** A glanceable board value, retained alongside the plain-language rule label. */
  value?: string;
  label: string;
  detail: string;
}
export interface FactionPresentation {
  overview: string;
  benefits: readonly FactionEffect[];
  constraints: readonly string[];
  startingShip: "interceptor" | "cruiser";
  blueprintSummary: string;
}

const common: FactionEffect[] = [];
const presentations: Record<FactionId, Omit<FactionPresentation, "startingShip" | "blueprintSummary">> = {
  'rho-indi': {
    overview: 'Fast raiders who turn combat into income and can break treaties without losing victory points.',
    benefits: [{icon:'drive',value:'4',label:'Move activations',detail:'Bring a wider fleet into position with four Move activations.'},{icon:'discovery',value:'−1',label:'draws become Money',detail:'Gain Money equal to your reputation draws minus one after combat.'},{icon:'shield',value:'0',label:'Traitor VP penalty',detail:'Betrayal still breaks diplomacy; the Traitor tile costs you no victory points.'}],
    constraints: ['No Dreadnoughts. Two ambassadors available.','Trade 3 Science or Materials for 1 resource, or 3 Money for 2 resources.'],
  },
  magellan: {
    overview: 'Pioneering explorers who recover Ancient technology and turn unused colony ships into resources.',
    benefits: [{icon:'population',value:'+1',label:'resource per colony ship',detail:'Flip an unused colony ship to receive one Money, Science or Materials.'},{icon:'discovery',value:'4',label:'technologies unlock a discovery',detail:'Reaching four technologies on a track unlocks your stored discovery reward.'},{icon:'hull',value:'+1',label:'VP per Ancient part used',detail:'Installed Ancient ship parts score even if you later remove them.'}],
    constraints: ['Converting a colony ship leaves fewer ships available to populate planets this round.','Trade 2 resources for 1; 3 Materials can instead buy 2 Money or Science.'],
  },
  midas: {
    overview: 'A wealthy civilization that buys an extra activation when a plan needs one more step.',
    benefits: [{icon:'influence',value:'+1',label:'paid activation per action',detail:'Buy one extra activation in the action you are taking. Explore and Research cost 3 Money; other actions cost 1.'},{icon:'population',value:'+1',label:'advanced Money planet',detail:'Begin with Advanced Economy and your advanced Money planet populated.'}],
    constraints: ['The extra activation costs 1 more Money when six or fewer influence discs remain.','Extra Influence capacity is one disc operation. Reactions do not gain the paid bonus.'],
  },
  ragnarok: {
    overview: 'Build and move in the same action to deploy your fleet exactly when it is needed.',
    benefits: [{icon:'drive',value:'+1',label:'Move during Build',detail:'A Build action includes one Move activation.'},{icon:'structure',value:'+1',label:'Build during Move',detail:'A Move action includes one Build activation. Use the separate counters to choose the sequence.'},{icon:'cannon',label:'Neutron Bombs at setup',detail:'Start with a Cruiser and Neutron Bombs for capturing populated sectors.'}],
    constraints: ['Mixed activations apply to normal actions, not reactions.','Trade 2 resources for 1. Ship costs, slots and initiative differ from the base boards.'],
  },
  eridani: {
    overview: "A rich opening economy with flexible early ship power.",
    benefits: [{ icon: "energy", value: "+1", label: "energy on mobile ships", detail: "Interceptors, Cruisers, and Dreadnoughts each begin with one permanent energy." }, { icon: "discovery", value: "2", label: "private reputation draws", detail: "Draw two reputation tiles before play; opponents never see their values." }],
    constraints: ["Start with 10 influence discs on the track, two fewer than most factions."],
  },
  hydran: {
    overview: "Research-led expansion from an advanced science home world.",
    benefits: [{ icon: "discovery", value: "2", label: "Research activations", detail: "Each Research action can buy two technologies sequentially." }, { icon: "population", value: "1", label: "advanced science starts populated", detail: "Your printed advanced science square is occupied at setup." }],
    constraints: ["Start with only 2 materials and 2 money; research momentum needs economic support."],
  },
  planta: {
    overview: "Fast expansion and territory scoring with fragile, specialized fleets.",
    benefits: [{ icon: "discovery", value: "2", label: "Explore activations", detail: "Each Explore action resolves two activations." }, { icon: "population", value: "4", label: "colony ships", detail: "One more colony ship than the standard three." }, { icon: "influence", value: "+1", label: "VP per controlled sector", detail: "Your faction scoring bonus adds one point for every sector you control." }],
    constraints: ["Ships have fewer blueprint slots and lower initiative.", "At the end of combat, opposing ships that occupy your sector destroy its population."],
  },
  draco: {
    overview: "Ancient-tolerant explorers who turn surviving Ancients into points.",
    benefits: [{ icon: "discovery", value: "0", label: "Ancient enemies", detail: "Ancient ships do not pin you or count as enemies for influence and movement." }, { icon: "influence", value: "+1", label: "VP per surviving Ancient", detail: "Score one point for each Ancient still on the board at game end." }],
    constraints: ["You cannot collect a discovery while Ancients remain in that sector.", "After drawing a second sector, choose one drawn sector or discard both."],
  },
  mechanema: {
    overview: "Industrial momentum with extra shipyard actions and cheaper construction.",
    benefits: [{ icon: "structure", value: "3", label: "Build activations", detail: "Each Build action can place three components." }, { icon: "hull", value: "3", label: "part installations", detail: "Each Upgrade action can install up to three parts; removals are free." }, { icon: "structure", value: "2–8", label: "construction cost", detail: "Interceptor 2, Cruiser 4, Dreadnought 7, Starbase 2, Orbital 3, Monolith 8 materials." }],
    constraints: ["Your strength is production; you still use the normal 3:1 trade rate."],
  },
  orion: {
    overview: "A powerful opening cruiser and unusually fast, well-powered blueprints.",
    benefits: [{ icon: "initiative", value: "+1", label: "initiative on every blueprint", detail: "Interceptor/Cruiser/Dreadnought/Starbase start at 3/2/1/4 initiative." }, { icon: "energy", value: "1/2/3", label: "mobile ship energy", detail: "Mobile ships begin with 1/2/3 energy; the Starbase begins with 3." }, { icon: "shield", value: "C", label: "Cruiser start", detail: "Begin with a Cruiser rather than an Interceptor." }],
    constraints: ["Trade is inefficient: pay 4 resources to gain 1."],
  },
  "terran-directorate": terranPresentation(),
  "terran-federation": terranPresentation(),
  "terran-union": terranPresentation(),
  "terran-republic": terranPresentation(),
  "terran-conglomerate": terranPresentation(),
  "terran-alliance": terranPresentation(),
};
function terranPresentation(): Omit<FactionPresentation, "startingShip" | "blueprintSummary"> {
  return {
    overview: "A balanced human civilization with strong trade and maneuvering.",
    benefits: [{ icon: "drive", value: "3", label: "Move activations", detail: "Each Move action can move three ships." }, { icon: "population", value: "2:1", label: "trade", detail: "Pay two resources to gain one of another type." }],
    constraints: ["No additional faction combat or scoring exception; strength comes from flexibility."],
  };
}

/** Human-readable effects are derived from reviewed catalog values and actual rules branches. */
export function factionPresentation(id: FactionId): FactionPresentation {
  const faction = getFaction(id);
  const blueprint = blueprintDefinition(id, faction.startingShip);
  const permanent = blueprint.permanent;
  const ship = faction.startingShip[0].toUpperCase() + faction.startingShip.slice(1);
  const energy = permanent.energyProduction ? ` · ${permanent.energyProduction} permanent energy` : "";
  const computer = permanent.computer ? ` · +${permanent.computer} computer` : "";
  return {
    ...presentations[id],
    benefits: [...common, ...presentations[id].benefits],
    startingShip: faction.startingShip,
    blueprintSummary: `${ship} start · initiative ${permanent.initiative}${energy}${computer}`,
  };
}
