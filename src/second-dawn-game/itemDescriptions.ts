import { getShipPart, type ShipPartId, type ShipStats } from '../../shared/eclipse/parts';
import type { Technology } from '../../shared/eclipse/technologies';

/** Presentation of the authoritative base catalog; never used for legality. */
export function describeShipPart(id: ShipPartId): string {
  const part = getShipPart(id);
  const effects: string[] = [];
  for (const weapon of part.weapons) effects.push(weapon.color==='magenta'?`${weapon.dice} Rift die each combat round: 0–3 damage, ignoring computers and shields. Hollow bursts inflict self-damage on your Rift-armed ships`:`${weapon.dice} ${weapon.dice === 1 ? 'die' : 'dice'} ${weapon.kind === 'missile' ? 'once at the start of each battle' : 'each combat round'}, ${weapon.damage} damage per hit`);
  if (part.movement) effects.push(`Move up to ${part.movement} ${part.movement === 1 ? 'sector' : 'sectors'} per ship activation`);
  if (part.hull) effects.push(`Survive ${part.hull} additional damage`);
  if (part.computer) effects.push(`+${part.computer} to attack rolls`);
  if (part.shield) effects.push(`−${part.shield} to enemy attack rolls against this ship`);
  if (part.initiative) effects.push(`+${part.initiative} initiative (fire earlier)`);
  if (part.energyProduction) effects.push(`Produces ${part.energyProduction} energy`);
  if (part.energyConsumption) effects.push(`Uses ${part.energyConsumption} energy`);
  if (part.placement === 'outside') effects.push('Installed permanently outside the grid; uses no slot');
  return effects.join(' · ') + '.';
}
export function describeTechnology(technology: Technology): string {
  const effect = technology.effect;
  switch (effect.kind) {
    case 'multi-activation': return `One extra activation for ${effect.actions.join(', ')} actions. Mixed actions increase their main type only; reactions remain one activation.`;
    case 'gain-colony-ship': return 'Gain one additional colony ship, available now and refreshed each round.';
    case 'ship-part': return `Unlocks this part for Upgrade; research does not install it. ${describeShipPart(effect.part)}`;
    case 'construct': return {
      starbase: 'Unlocks Starbases for Build: stationary combat ships that defend a sector using your Starbase blueprint.',
      orbital: 'Unlocks Orbitals for Build: add a population space for money or science in a controlled sector; colonize it to raise income.',
      monolith: 'Unlocks Monoliths for Build: each Monolith in a sector you control scores 3 VP at the end of the game.',
    }[effect.piece];
    case 'colonize-advanced': return `You may colonize advanced ${effect.resource === 'all' ? 'money, science and materials' : effect.resource} population spaces. Colony ships and population cubes are still required.`;
    case 'automatic-population-bombardment': return 'After winning a battle, destroy all enemy population in that sector without rolling bombardment dice, unless protected by Neutron Absorber.';
    case 'extra-activation': return `Each ${effect.action === 'build' ? 'Build action can construct' : effect.action === 'move' ? 'Move action grants' : 'Upgrade action can install'} ${effect.amount} extra ${effect.action === 'build' ? 'piece' : effect.action === 'move' ? 'ship activation' : 'parts'}${effect.amount === 1 ? '' : effect.action === 'upgrade' ? '' : 's'}. Reactions retain their one-activation limit.`;
    case 'gain-influence': return `Immediately add ${effect.amount} influence ${effect.amount === 1 ? 'disc' : 'discs'} to your influence track, increasing action and sector capacity and reducing projected upkeep.`;
    case 'wormhole-generator': return 'Connect adjacent sectors when either facing edge has a wormhole; normally both facing edges need one. Applies to movement, exploration and influence.';
    case 'artifact-resources': return `Immediately gain ${effect.perArtifact} resources for each artifact in sectors you control. Choose one resource type per artifact; different artifacts may yield different resources.`;
    case 'split-antimatter-damage': return 'Split the 4 damage from each Antimatter Cannon hit among multiple eligible enemy ships. Does not split Antimatter Missile damage.';
    case 'ignore-neutron-bombs': return 'Your population is protected from Neutron Bombs. An attacker must roll normal bombardment dice to destroy it.';
    case 'cloaking': return `Each of your ships requires ${effect.enemiesRequiredToPin} enemy ships to pin it, letting smaller fleets move away more easily.`;
    case 'place-warp-portal': return `Immediately place a Warp Portal in a sector you control. All portal sectors connect to each other regardless of distance. This portal adds ${effect.controlledSectorVp} VP to its sector for its final controller.`;
    case 'draw-discovery': return 'Immediately draw and resolve a discovery for your home sector: keep its 2 VP side or choose its reward.';
  }
}
export function describeWeapons(stats: ShipStats): string {
  return stats.weapons.length ? stats.weapons.map(w => w.color==='magenta'?`${w.dice} Rift die (0–3 damage; may backfire)`:`${w.dice} × ${w.damage} ${w.kind === 'cannon' ? 'cannon' : 'missile'}`).join(' + ') : 'Unarmed';
}
