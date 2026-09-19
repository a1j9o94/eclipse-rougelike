import {getFaction, type FactionId, type CivilizationColor} from '../../shared/eclipse/catalog';
export const FACTION_COLORS:Record<CivilizationColor,string>={red:'#e99b9b',blue:'#88cde7',green:'#8bd4ad',yellow:'#efd27b',white:'#e3e7ed',black:'#bac0ce'};

/** Piece ownership is independent of species in expanded games; old saves use their board color. */
export function seatColor(seat:{faction:FactionId;pieceColor?:CivilizationColor}):string {return FACTION_COLORS[seat.pieceColor??getFaction(seat.faction).color];}
