export const ECONOMY = {
  // Keep values aligned with src/config/economy.ts (source of truth moved here)
  buildInterceptor: { credits: 30, materials: 6 },
  upgradeCosts: {
    interceptorToCruiser: { credits: 20, materials: 8 },
    cruiserToDread: { credits: 15, materials: 10 },
  },
  dockUpgrade: { credits: 15, materials: 3, capacityDelta: 1, capacityMax: 12 },
  reroll: { base: 8, increment: 4 },
  shop: { itemsBase: 4 },
  multiplayerLossPct: 0.5,
} as const;

export function nextTierCost(curr:number){
  if(curr===1) return { c:20, s:4 } as const;
  if(curr===2) return { c:50, s:8 } as const;
  return null;
}

export function calcRewardsForFrameId(frameId:string){
  if(frameId==='interceptor') return { c:22, m:2, s:1 };
  if(frameId==='cruiser') return { c:32, m:3, s:2 };
  if(frameId==='dread') return { c:52, m:4, s:3 };
  return { c:0, m:0, s:0 };
}
