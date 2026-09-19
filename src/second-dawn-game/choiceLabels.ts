import type {PendingDecision} from '../../shared/eclipse/types';

const labels:Record<PendingDecision['kind'],string>={
 exploration:'sector placement',discovery:'discovery',colonization:'colonization',
 'diplomacy-window':'ambassador exchange',diplomacy:'ambassador exchange',
 'combat-allocation':'combat allocation','combat-turn':'combat',retreat:'retreat',
 reputation:'reputation',bankruptcy:'upkeep shortfall','population-return':'population return',
 control:'sector control','free-technology':'technology reward','resource-reward':'resource reward',
 'portal-placement':'portal placement','initiative-order':'combat initiative',bombardment:'bombardment',
 'ancient-part':'discovered ship part',
};
export function choiceLabel(decision:PendingDecision):string{return labels[decision.kind];}
