import type {Technology} from '../../shared/eclipse/technologies';
/** Short first-read benefit; detailed rules remain available through effect inspection. */
export function technologyBenefit(technology:Technology):string{
 const effect=technology.effect;
 switch(effect.kind){
  case 'ship-part':return 'Unlock this part for Upgrade.';
  case 'automatic-population-bombardment':return 'After victory: destroy enemy population unless protected by Neutron Absorber.';
  case 'construct':return effect.piece==='monolith'?'Build Monoliths: 3 VP each in your sectors.':effect.piece==='orbital'?'Build Orbitals: one Money or Science planet.':'Build Starbases to defend your sectors.';
  case 'colonize-advanced':return `Unlock advanced ${effect.resource==='all'?'Money, Science and Materials':effect.resource} planets.`;
  case 'extra-activation':return `+${effect.amount} ${effect.action==='build'?'piece':effect.action==='move'?'ship activation':'part installation'} per ${effect.action} action.`;
  case 'multi-activation':return `+1 activation for ${effect.actions.join(' and ')} actions.`;
  case 'gain-influence':return `Gain ${effect.amount} influence ${effect.amount===1?'disc':'discs'} now.`;
  case 'gain-colony-ship':return 'Gain a colony ship now; refresh it each round.';
  case 'wormhole-generator':return 'Connect adjacent sectors through one facing wormhole.';
  case 'artifact-resources':return `Gain ${effect.perArtifact} resources per controlled artifact now.`;
  case 'split-antimatter-damage':return 'Split each Antimatter Cannon hit between enemy ships.';
  case 'ignore-neutron-bombs':return 'Protect your population from Neutron Bombs.';
  case 'cloaking':return `${effect.enemiesRequiredToPin} enemy ships needed to pin each of yours.`;
  case 'place-warp-portal':return `Place a portal now: connect portal sectors and add ${effect.controlledSectorVp} sector VP.`;
  case 'draw-discovery':return 'Draw a home-sector discovery now: keep 2 VP or use its reward.';
 }
}
