export function sectorScaling(sector:number){
  if(sector<=1) return { tonBonus: 0, tierBonus: 0, boss:false } as const;
  if(sector===2) return { tonBonus: 0.5, tierBonus: 0, boss:false } as const;
  if(sector===3) return { tonBonus: 1, tierBonus: 0, boss:false } as const;
  if(sector===4) return { tonBonus: 1, tierBonus: 0, boss:false } as const;
  if(sector===5) return { tonBonus: 1.5, tierBonus: 0, boss:true } as const;
  if(sector===6) return { tonBonus: 1, tierBonus: 1, boss:false } as const;
  if(sector===7) return { tonBonus: 1, tierBonus: 1, boss:false } as const;
  if(sector===8) return { tonBonus: 1.5, tierBonus: 2, boss:false } as const;
  if(sector===9) return { tonBonus: 2, tierBonus: 2, boss:false } as const;
  return { tonBonus: 2, tierBonus: 2, boss:true } as const; // sector 10
}


