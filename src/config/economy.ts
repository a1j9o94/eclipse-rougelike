// Economy & pacing knobs in one place

export const ECONOMY = {
  buildInterceptor: { credits: 2, materials: 3 },
  upgradeCosts: {
    interceptorToCruiser: { credits: 3, materials: 3 },
    cruiserToDread: { credits: 4, materials: 5 },
  },
  dockUpgrade: { credits: 4, materials: 4, capacityDelta: 2, capacityMax: 10 },
  reroll: { base: 8, increment: 4 },
  shop: { itemsBase: 4 },
} as const;

export function nextTierCost(curr:number){
  if(curr===1) return { c:20, s:1 } as const;
  if(curr===2) return { c:50, s:2 } as const;
  return null;
}

export function calcRewardsForFrameId(frameId:string){
  if(frameId==='interceptor') return { c:22, m:2, s:1 };
  if(frameId==='cruiser') return { c:32, m:3, s:2 };
  if(frameId==='dread') return { c:52, m:4, s:3 };
  return { c:0, m:0, s:0 };
}


