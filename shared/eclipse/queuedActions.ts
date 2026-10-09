import type {GameCommand} from './types';

export interface QueuedAction {
 command:GameCommand;
 status:'pending'|'failed';
 error?:string;
}
export interface QueuedActionReceipt {revision:number;type:GameCommand['type']}

/** A queue starts one action; it never answers a choice or continues an old action. */
export function canQueueCommand(command:GameCommand):boolean {
 return ['explore','research','build','upgrade','move','influence','pass','trade','discard-reputation','trade-and-act','research-development','quantum-research','place-shrine','buy-minor-species','colonize','offer-diplomacy','convert-colony-ship'].includes(command.type);
}
