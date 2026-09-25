import type { HexEdge } from "./geometry";

export interface SectorPopulationSquare {
  readonly resource: "money" | "science" | "materials" | "gray";
  readonly advanced: boolean;
}
export interface SectorDefinition {
  readonly id: number;
  readonly name: string;
  /** Printed flat-top face: NE=0, N=1, NW=2, SW=3, S=4, SE=5.
   * A 30° clockwise display rotation maps these to geometry.ts E,NE,NW,W,SW,SE.
   * Image border bleed from another hex is not a printed wormhole.
   */
  readonly wormholes: readonly HexEdge[];
  readonly victoryPoints: number;
  readonly population: readonly SectorPopulationSquare[];
  readonly ancients: number;
  readonly artifacts: number;
  readonly discovery: boolean;
  readonly warpPortal: boolean;
  readonly guardian: boolean;
  readonly gcds: boolean;
  readonly homeArrow: HexEdge | null;
  /** Physical component scan; crosschecked against publisher examples where available. */
  readonly source: string;
}
/** 54 physical tiles, 60 available faces because six home tiles are double-sided.
 * Component evidence and discrepancies: coding_agents/second_dawn_sector_audit.md.
 * Base box only, including its optional Warp Portal module.
 */
export const SECTORS: readonly SectorDefinition[] = [
  {
    id: 1,
    name: "Galactic Center",
    wormholes: [0, 1, 2, 3, 4, 5],
    victoryPoints: 4,
    population: [
      {
        resource: "money",
        advanced: false,
      },
      {
        resource: "money",
        advanced: false,
      },
      {
        resource: "science",
        advanced: true,
      },
      {
        resource: "science",
        advanced: false,
      },
      {
        resource: "materials",
        advanced: true,
      },
      {
        resource: "materials",
        advanced: false,
      },
    ],
    ancients: 0,
    artifacts: 1,
    discovery: true,
    warpPortal: false,
    guardian: false,
    gcds: true,
    homeArrow: null,
    source:
      "https://images.steamusercontent.com/ugc/1267149075135711258/51CD62FCCA31C64326606AC68E89E8BC01FE25BE/",
  },
  {
    id: 101,
    name: "Castor",
    wormholes: [0, 2, 3, 4, 5],
    victoryPoints: 2,
    population: [
      {
        resource: "money",
        advanced: false,
      },
      {
        resource: "materials",
        advanced: true,
      },
      {
        resource: "materials",
        advanced: false,
      },
    ],
    ancients: 1,
    artifacts: 0,
    discovery: true,
    warpPortal: false,
    guardian: false,
    gcds: false,
    homeArrow: null,
    source:
      "https://images.steamusercontent.com/ugc/1267149075135792000/022502A034F951E243B09F0AE0DEF3F33068B8CD/",
  },
  {
    id: 102,
    name: "Pollux",
    wormholes: [1, 2, 4, 5],
    victoryPoints: 2,
    population: [
      {
        resource: "science",
        advanced: false,
      },
      {
        resource: "science",
        advanced: false,
      },
    ],
    ancients: 0,
    artifacts: 0,
    discovery: false,
    warpPortal: false,
    guardian: false,
    gcds: false,
    homeArrow: null,
    source:
      "https://images.steamusercontent.com/ugc/1267149075135792773/E1A9181C5EC40B222DE9D2647526C28BE9477CBB/",
  },
  {
    id: 103,
    name: "Beta Leonis",
    wormholes: [0, 1, 2, 3, 5],
    victoryPoints: 2,
    population: [
      {
        resource: "money",
        advanced: false,
      },
      {
        resource: "science",
        advanced: false,
      },
    ],
    ancients: 0,
    artifacts: 0,
    discovery: false,
    warpPortal: false,
    guardian: false,
    gcds: false,
    homeArrow: null,
    source:
      "https://images.steamusercontent.com/ugc/1267149075135790571/6A0536BEA62F1AAE908C34298210C823E6F7EE65/",
  },
  {
    id: 104,
    name: "Arcturus",
    wormholes: [0, 1, 3, 4],
    victoryPoints: 2,
    population: [
      {
        resource: "money",
        advanced: false,
      },
      {
        resource: "money",
        advanced: true,
      },
      {
        resource: "science",
        advanced: false,
      },
      {
        resource: "science",
        advanced: true,
      },
    ],
    ancients: 2,
    artifacts: 0,
    discovery: true,
    warpPortal: false,
    guardian: false,
    gcds: false,
    homeArrow: null,
    source:
      "https://images.steamusercontent.com/ugc/1267149075135791344/87A0291BB5C99EFCE66D4567FDA9BEDA357E9765/",
  },
  {
    id: 105,
    name: "Zeta Herculis",
    wormholes: [0, 1, 2, 3, 4],
    victoryPoints: 2,
    population: [
      {
        resource: "money",
        advanced: false,
      },
      {
        resource: "science",
        advanced: false,
      },
      {
        resource: "materials",
        advanced: true,
      },
    ],
    ancients: 1,
    artifacts: 0,
    discovery: true,
    warpPortal: false,
    guardian: false,
    gcds: false,
    homeArrow: null,
    source:
      "https://images.steamusercontent.com/ugc/1267149075135791686/E0A383B8533F71604E5C07E7E4B7E0B7A6A52314/",
  },
  {
    id: 106,
    name: "Capella",
    wormholes: [0, 1, 4, 5],
    victoryPoints: 2,
    population: [
      {
        resource: "science",
        advanced: false,
      },
      {
        resource: "materials",
        advanced: false,
      },
    ],
    ancients: 0,
    artifacts: 0,
    discovery: false,
    warpPortal: false,
    guardian: false,
    gcds: false,
    homeArrow: null,
    source:
      "https://images.steamusercontent.com/ugc/1267149075135789798/5E83FB4D97C56BB738CFF183353434B99F6A8991/",
  },
  {
    id: 107,
    name: "Aldebaran",
    wormholes: [0, 1, 2, 4, 5],
    victoryPoints: 3,
    population: [
      {
        resource: "money",
        advanced: false,
      },
      {
        resource: "science",
        advanced: true,
      },
      {
        resource: "materials",
        advanced: true,
      },
    ],
    ancients: 0,
    artifacts: 1,
    discovery: false,
    warpPortal: false,
    guardian: false,
    gcds: false,
    homeArrow: null,
    source:
      "https://images.steamusercontent.com/ugc/1267149075135792376/9D682AEBB8D23045724691B8551001E514721A8C/",
  },
  {
    id: 108,
    name: "Mu Cassiopeiae",
    wormholes: [0, 1, 3, 4],
    victoryPoints: 2,
    population: [
      {
        resource: "money",
        advanced: true,
      },
      {
        resource: "science",
        advanced: false,
      },
      {
        resource: "gray",
        advanced: false,
      },
    ],
    ancients: 1,
    artifacts: 0,
    discovery: true,
    warpPortal: false,
    guardian: false,
    gcds: false,
    homeArrow: null,
    source:
      "https://images.steamusercontent.com/ugc/1267149075135788923/539FFC2F1B9E3931A04B11A6DB06B159015C92D2/",
  },
  {
    id: 109,
    name: "Alpha Lacertae",
    wormholes: [0, 2, 3, 4, 5],
    victoryPoints: 4,
    population: [
      {
        resource: "money",
        advanced: false,
      },
      {
        resource: "materials",
        advanced: false,
      },
    ],
    ancients: 2,
    artifacts: 1,
    discovery: true,
    warpPortal: false,
    guardian: false,
    gcds: false,
    homeArrow: null,
    source:
      "https://images.steamusercontent.com/ugc/1267149075135790917/63AF5DFB567F610011224F7085463D18273CF455/",
  },
  {
    id: 110,
    name: "Iota Boötis",
    wormholes: [1, 3, 4, 5],
    victoryPoints: 2,
    population: [
      {
        resource: "money",
        advanced: true,
      },
      {
        resource: "gray",
        advanced: true,
      },
    ],
    ancients: 0,
    artifacts: 0,
    discovery: true,
    warpPortal: false,
    guardian: false,
    gcds: false,
    homeArrow: null,
    source:
      "https://images.steamusercontent.com/ugc/1267149075135790167/1196D012D0C209EDF9D5A58CA22C761E5C83A18B/",
  },
  {
    id: 201,
    name: "Alpha Centauri",
    wormholes: [0, 2, 4],
    victoryPoints: 1,
    population: [
      {
        resource: "money",
        advanced: false,
      },
      {
        resource: "materials",
        advanced: false,
      },
    ],
    ancients: 0,
    artifacts: 0,
    discovery: false,
    warpPortal: false,
    guardian: false,
    gcds: false,
    homeArrow: null,
    source:
      "https://images.steamusercontent.com/ugc/1267149075135786069/314C2CF08585DAF112B0C5CCE7AD8D407608FB56/",
  },
  {
    id: 202,
    name: "Fomalhaut",
    wormholes: [0, 2, 4],
    victoryPoints: 2,
    population: [
      {
        resource: "science",
        advanced: false,
      },
      {
        resource: "science",
        advanced: true,
      },
    ],
    ancients: 0,
    artifacts: 1,
    discovery: false,
    warpPortal: false,
    guardian: false,
    gcds: false,
    homeArrow: null,
    source:
      "https://images.steamusercontent.com/ugc/1267149075135782882/4432EF6C7C2DAD66E49C401872611ABFAC4C4ED7/",
  },
  {
    id: 203,
    name: "Chi Draconis",
    wormholes: [0, 1, 2, 4],
    victoryPoints: 2,
    population: [
      {
        resource: "money",
        advanced: true,
      },
      {
        resource: "science",
        advanced: false,
      },
      {
        resource: "materials",
        advanced: false,
      },
    ],
    ancients: 2,
    artifacts: 0,
    discovery: true,
    warpPortal: false,
    guardian: false,
    gcds: false,
    homeArrow: null,
    source:
      "https://images.steamusercontent.com/ugc/1267149075135780847/E33B76916E782DF34CC12447B5ED6C8B884C2DE9/",
  },
  {
    id: 204,
    name: "Vega",
    wormholes: [0, 1, 2, 4],
    victoryPoints: 2,
    population: [
      {
        resource: "money",
        advanced: true,
      },
      {
        resource: "materials",
        advanced: true,
      },
      {
        resource: "gray",
        advanced: false,
      },
    ],
    ancients: 1,
    artifacts: 1,
    discovery: true,
    warpPortal: false,
    guardian: false,
    gcds: false,
    homeArrow: null,
    source:
      "https://images.steamusercontent.com/ugc/1267149075135786823/DB38BD896155FDB470C6D81FF335008F0480C101/",
  },
  {
    id: 205,
    name: "Mu Herculis",
    wormholes: [3, 4, 5],
    victoryPoints: 1,
    population: [
      {
        resource: "money",
        advanced: false,
      },
      {
        resource: "money",
        advanced: true,
      },
      {
        resource: "science",
        advanced: true,
      },
    ],
    ancients: 0,
    artifacts: 1,
    discovery: false,
    warpPortal: false,
    guardian: false,
    gcds: false,
    homeArrow: null,
    source:
      "https://images.steamusercontent.com/ugc/1267149075135785302/CD0853509E321D6D8FC9EB402F4CDEC0F8304A5A/",
  },
  {
    id: 206,
    name: "Epsilon Indi",
    wormholes: [0, 2, 4, 5],
    victoryPoints: 1,
    population: [
      {
        resource: "materials",
        advanced: false,
      },
    ],
    ancients: 0,
    artifacts: 0,
    discovery: true,
    warpPortal: false,
    guardian: false,
    gcds: false,
    homeArrow: null,
    source:
      "https://images.steamusercontent.com/ugc/1267149075135784521/ED97DC7E3C2CC22BFFAC47F26FF143A270C71C41/",
  },
  {
    id: 207,
    name: "Zeta Reticuli",
    wormholes: [0, 1, 4],
    victoryPoints: 2,
    population: [],
    ancients: 0,
    artifacts: 0,
    discovery: true,
    warpPortal: false,
    guardian: false,
    gcds: false,
    homeArrow: null,
    source:
      "https://images.steamusercontent.com/ugc/1267149075135783401/01FAAF654DE1FB89A15C912D91B5AEDB28C5B241/",
  },
  {
    id: 208,
    name: "Iota Persei",
    wormholes: [1, 2, 4, 5],
    victoryPoints: 2,
    population: [],
    ancients: 0,
    artifacts: 0,
    discovery: true,
    warpPortal: false,
    guardian: false,
    gcds: false,
    homeArrow: null,
    source:
      "https://images.steamusercontent.com/ugc/1267149075135781803/A25CAC06A1F83016C1F4F62B6F90CE3A655B3523/",
  },
  {
    id: 209,
    name: "Delta Eridani",
    wormholes: [0, 1, 2, 4],
    victoryPoints: 1,
    population: [
      {
        resource: "money",
        advanced: false,
      },
      {
        resource: "science",
        advanced: false,
      },
    ],
    ancients: 0,
    artifacts: 0,
    discovery: false,
    warpPortal: false,
    guardian: false,
    gcds: false,
    homeArrow: null,
    source:
      "https://images.steamusercontent.com/ugc/1267149075135782205/FE64320F052A00F6EC9847729EF5FF1C3082EF50/",
  },
  {
    id: 210,
    name: "Psi Capricorni",
    wormholes: [1, 2, 4],
    victoryPoints: 1,
    population: [
      {
        resource: "money",
        advanced: false,
      },
      {
        resource: "materials",
        advanced: false,
      },
    ],
    ancients: 0,
    artifacts: 0,
    discovery: false,
    warpPortal: false,
    guardian: false,
    gcds: false,
    homeArrow: null,
    source:
      "https://images.steamusercontent.com/ugc/1267149075135783799/4890A66A7564B51B8F27F927B473A9FC0C2C34B8/",
  },
  {
    id: 211,
    name: "Beta Aquilae",
    wormholes: [0, 1, 4, 5],
    victoryPoints: 1,
    population: [
      {
        resource: "money",
        advanced: false,
      },
      {
        resource: "materials",
        advanced: true,
      },
      {
        resource: "gray",
        advanced: false,
      },
    ],
    ancients: 1,
    artifacts: 0,
    discovery: true,
    warpPortal: false,
    guardian: false,
    gcds: false,
    homeArrow: null,
    source:
      "https://images.steamusercontent.com/ugc/1267149075135782563/171FCC083908BBA514FA00260CAF42895AC839EA/",
  },
  {
    id: 214,
    name: "Beta Monocerotis",
    wormholes: [0, 1, 2, 3, 5],
    victoryPoints: 2,
    population: [
      {
        resource: "science",
        advanced: false,
      },
      {
        resource: "materials",
        advanced: true,
      },
      {
        resource: "gray",
        advanced: true,
      },
    ],
    ancients: 1,
    artifacts: 0,
    discovery: true,
    warpPortal: false,
    guardian: false,
    gcds: false,
    homeArrow: null,
    source:
      "https://images.steamusercontent.com/ugc/1267149075135784141/5A51B3BCB4366507BFC75F370C7B4908D88BD65E/",
  },
  {
    id: 221,
    name: "Procyon",
    wormholes: [0, 1, 3, 4],
    victoryPoints: 3,
    population: [
      {
        resource: "money",
        advanced: false,
      },
      {
        resource: "money",
        advanced: true,
      },
      {
        resource: "science",
        advanced: false,
      },
      {
        resource: "science",
        advanced: true,
      },
      {
        resource: "materials",
        advanced: false,
      },
    ],
    ancients: 0,
    artifacts: 1,
    discovery: false,
    warpPortal: false,
    guardian: false,
    gcds: false,
    homeArrow: 1,
    source:
      "https://images.steamusercontent.com/ugc/1267149075135738803/D928043E4D85CC51F71E252F4959597D1BFFE25C/",
  },
  {
    id: 222,
    name: "Epsilon Eridani",
    wormholes: [0, 1, 3, 4],
    victoryPoints: 3,
    population: [
      {
        resource: "money",
        advanced: false,
      },
      {
        resource: "money",
        advanced: true,
      },
      {
        resource: "science",
        advanced: false,
      },
      {
        resource: "science",
        advanced: true,
      },
    ],
    ancients: 0,
    artifacts: 1,
    discovery: false,
    warpPortal: false,
    guardian: false,
    gcds: false,
    homeArrow: 1,
    source:
      "https://images.steamusercontent.com/ugc/1267149075135736208/9C9D02F5D00E52739A259A54193BB12599394756/",
  },
  {
    id: 223,
    name: "Altair",
    wormholes: [0, 1, 3, 4],
    victoryPoints: 3,
    population: [
      {
        resource: "money",
        advanced: false,
      },
      {
        resource: "money",
        advanced: true,
      },
      {
        resource: "science",
        advanced: false,
      },
      {
        resource: "science",
        advanced: true,
      },
      {
        resource: "materials",
        advanced: false,
      },
    ],
    ancients: 0,
    artifacts: 1,
    discovery: false,
    warpPortal: false,
    guardian: false,
    gcds: false,
    homeArrow: 1,
    source:
      "https://images.steamusercontent.com/ugc/1267149075135732511/E25B30B5E1B5C98F9BA0D1CDEA10D57384322826/",
  },
  {
    id: 224,
    name: "Beta Hydri",
    wormholes: [0, 1, 3, 4],
    victoryPoints: 3,
    population: [
      {
        resource: "money",
        advanced: false,
      },
      {
        resource: "science",
        advanced: true,
      },
      {
        resource: "materials",
        advanced: true,
      },
    ],
    ancients: 0,
    artifacts: 1,
    discovery: false,
    warpPortal: false,
    guardian: false,
    gcds: false,
    homeArrow: 1,
    source:
      "https://images.steamusercontent.com/ugc/1267149075135735387/26409967E93AD9A59E9CE5AD0AAB9BAC0395AE67/",
  },
  {
    id: 225,
    name: "Eta Cassiopeiae",
    wormholes: [0, 1, 3, 4],
    victoryPoints: 3,
    population: [
      {
        resource: "money",
        advanced: false,
      },
      {
        resource: "money",
        advanced: true,
      },
      {
        resource: "science",
        advanced: false,
      },
      {
        resource: "science",
        advanced: true,
      },
      {
        resource: "materials",
        advanced: false,
      },
    ],
    ancients: 0,
    artifacts: 1,
    discovery: false,
    warpPortal: false,
    guardian: false,
    gcds: false,
    homeArrow: 1,
    source:
      "https://images.steamusercontent.com/ugc/1267149075135737970/0A2D84E2BA0D9B530A5257A930676C4C6886A48B/",
  },
  {
    id: 226,
    name: "61 Cygni",
    wormholes: [0, 1, 3, 4],
    victoryPoints: 3,
    population: [
      {
        resource: "science",
        advanced: false,
      },
      {
        resource: "materials",
        advanced: false,
      },
    ],
    ancients: 0,
    artifacts: 1,
    discovery: false,
    warpPortal: false,
    guardian: false,
    gcds: false,
    homeArrow: 1,
    source:
      "https://images.steamusercontent.com/ugc/1267149075135734436/D5D32BE77336E187DAC77B3635C4066725944BE1/",
  },
  {
    id: 227,
    name: "Sirius",
    wormholes: [0, 1, 3, 4],
    victoryPoints: 3,
    population: [
      {
        resource: "money",
        advanced: false,
      },
      {
        resource: "money",
        advanced: true,
      },
      {
        resource: "science",
        advanced: false,
      },
      {
        resource: "science",
        advanced: true,
      },
      {
        resource: "materials",
        advanced: false,
      },
    ],
    ancients: 0,
    artifacts: 1,
    discovery: false,
    warpPortal: false,
    guardian: false,
    gcds: false,
    homeArrow: 1,
    source:
      "https://images.steamusercontent.com/ugc/1267149075135733435/058B4ECA21CA5263BA8A87193637D400383B1445/",
  },
  {
    id: 228,
    name: "Sigma Draconis",
    wormholes: [0, 1, 3, 4],
    victoryPoints: 3,
    population: [
      {
        resource: "money",
        advanced: false,
      },
      {
        resource: "science",
        advanced: false,
      },
      {
        resource: "materials",
        advanced: true,
      },
    ],
    ancients: 0,
    artifacts: 1,
    discovery: false,
    warpPortal: false,
    guardian: false,
    gcds: false,
    homeArrow: 1,
    source:
      "https://images.steamusercontent.com/ugc/1267149075135737148/C3A88A982004279B4EED0C3B4503385369686A2F/",
  },
  {
    id: 229,
    name: "Tau Ceti",
    wormholes: [0, 1, 3, 4],
    victoryPoints: 3,
    population: [
      {
        resource: "money",
        advanced: false,
      },
      {
        resource: "money",
        advanced: true,
      },
      {
        resource: "science",
        advanced: false,
      },
      {
        resource: "science",
        advanced: true,
      },
      {
        resource: "materials",
        advanced: false,
      },
    ],
    ancients: 0,
    artifacts: 1,
    discovery: false,
    warpPortal: false,
    guardian: false,
    gcds: false,
    homeArrow: 1,
    source:
      "https://images.steamusercontent.com/ugc/1267149075135740618/1C9E2E3D47C0540B26DC72B8D4822E419D238E55/",
  },
  {
    id: 230,
    name: "Lambda Aurigae",
    wormholes: [0, 1, 3, 4],
    victoryPoints: 3,
    population: [
      {
        resource: "money",
        advanced: false,
      },
      {
        resource: "money",
        advanced: true,
      },
      {
        resource: "science",
        advanced: false,
      },
      {
        resource: "materials",
        advanced: true,
      },
    ],
    ancients: 0,
    artifacts: 1,
    discovery: false,
    warpPortal: false,
    guardian: false,
    gcds: false,
    homeArrow: 1,
    source:
      "https://images.steamusercontent.com/ugc/1267149075135751199/6CAFDB82F8362DBAF70BE614113E03B8744CA9B2/",
  },
  {
    id: 231,
    name: "Delta Pavonis",
    wormholes: [0, 1, 3, 4],
    victoryPoints: 3,
    population: [
      {
        resource: "money",
        advanced: false,
      },
      {
        resource: "money",
        advanced: true,
      },
      {
        resource: "science",
        advanced: false,
      },
      {
        resource: "science",
        advanced: true,
      },
      {
        resource: "materials",
        advanced: false,
      },
    ],
    ancients: 0,
    artifacts: 1,
    discovery: false,
    warpPortal: false,
    guardian: false,
    gcds: false,
    homeArrow: 1,
    source:
      "https://images.steamusercontent.com/ugc/1267149075135727964/7A93FB3DEAF7D0953475A920A67F17DD77F0F41F/",
  },
  {
    id: 232,
    name: "Rigel",
    wormholes: [0, 1, 3, 4],
    victoryPoints: 3,
    population: [
      {
        resource: "money",
        advanced: true,
      },
      {
        resource: "science",
        advanced: false,
      },
      {
        resource: "materials",
        advanced: true,
      },
      {
        resource: "materials",
        advanced: false,
      },
    ],
    ancients: 0,
    artifacts: 1,
    discovery: false,
    warpPortal: false,
    guardian: false,
    gcds: false,
    homeArrow: 1,
    source:
      "https://images.steamusercontent.com/ugc/1267149075135749754/779DD19611075E19FF6A512D5CE323FDBB117A49/",
  },
  {
    id: 271,
    name: "Omega Fornacis",
    wormholes: [0, 1, 3, 4],
    victoryPoints: 2,
    population: [
      {
        resource: "money",
        advanced: false,
      },
      {
        resource: "science",
        advanced: false,
      },
      {
        resource: "materials",
        advanced: true,
      },
    ],
    ancients: 0,
    artifacts: 1,
    discovery: true,
    warpPortal: false,
    guardian: true,
    gcds: false,
    homeArrow: 1,
    source:
      "https://images.steamusercontent.com/ugc/1267149075135717669/3E7FA3A073354686E636B40856E29691693DE6A9/",
  },
  {
    id: 272,
    name: "Sigma Hydrae",
    wormholes: [0, 1, 3, 4],
    victoryPoints: 2,
    population: [
      {
        resource: "money",
        advanced: false,
      },
      {
        resource: "science",
        advanced: true,
      },
      {
        resource: "materials",
        advanced: false,
      },
    ],
    ancients: 0,
    artifacts: 1,
    discovery: true,
    warpPortal: false,
    guardian: true,
    gcds: false,
    homeArrow: 1,
    source:
      "https://images.steamusercontent.com/ugc/1267149075135719604/4547613D6D2DC6C5B11E30FED95A0315E68D2F36/",
  },
  {
    id: 273,
    name: "Theta Ophiuchi",
    wormholes: [0, 1, 3, 4],
    victoryPoints: 2,
    population: [
      {
        resource: "money",
        advanced: false,
      },
      {
        resource: "materials",
        advanced: true,
      },
      {
        resource: "materials",
        advanced: false,
      },
    ],
    ancients: 0,
    artifacts: 1,
    discovery: true,
    warpPortal: false,
    guardian: true,
    gcds: false,
    homeArrow: 1,
    source:
      "https://images.steamusercontent.com/ugc/1267149075135719017/0EFFCC597B73774723EF8030D4556C5FA9A457A1/",
  },
  {
    id: 274,
    name: "Alpha Lyncis",
    wormholes: [0, 1, 3, 4],
    victoryPoints: 2,
    population: [
      {
        resource: "money",
        advanced: false,
      },
      {
        resource: "science",
        advanced: false,
      },
      {
        resource: "science",
        advanced: true,
      },
    ],
    ancients: 0,
    artifacts: 1,
    discovery: true,
    warpPortal: false,
    guardian: true,
    gcds: false,
    homeArrow: 1,
    source:
      "https://images.steamusercontent.com/ugc/1267149075135718357/8F8B2130FB15932196C4CE26B41357A19E97C5F4/",
  },
  {
    id: 281,
    name: "Delta Corvi",
    wormholes: [1, 2, 4, 5],
    victoryPoints: 2,
    population: [
      {
        resource: "money",
        advanced: false,
      },
      {
        resource: "science",
        advanced: false,
      },
    ],
    ancients: 0,
    artifacts: 0,
    discovery: true,
    warpPortal: true,
    guardian: false,
    gcds: false,
    homeArrow: null,
    source:
      "https://images.steamusercontent.com/ugc/1267149075135784893/B9F7CF581F43AF70E6A03D7E6276C965BAD838D7/",
  },
  {
    id: 301,
    name: "Zeta Draconis",
    wormholes: [1, 4, 5],
    victoryPoints: 2,
    population: [
      {
        resource: "money",
        advanced: false,
      },
      {
        resource: "science",
        advanced: false,
      },
      {
        resource: "materials",
        advanced: true,
      },
    ],
    ancients: 2,
    artifacts: 1,
    discovery: true,
    warpPortal: false,
    guardian: false,
    gcds: false,
    homeArrow: null,
    source:
      "https://images.steamusercontent.com/ugc/1267149075135793898/400FD1237758245F2F9C8DB989380D4489296F9C/",
  },
  {
    id: 302,
    name: "Gamma Serpentis",
    wormholes: [1, 3, 4],
    victoryPoints: 2,
    population: [
      {
        resource: "money",
        advanced: true,
      },
      {
        resource: "science",
        advanced: true,
      },
      {
        resource: "materials",
        advanced: false,
      },
    ],
    ancients: 1,
    artifacts: 1,
    discovery: true,
    warpPortal: false,
    guardian: false,
    gcds: false,
    homeArrow: null,
    source:
      "https://images.steamusercontent.com/ugc/1267149075135800091/B8CCD5A6B59BBBFCB6D04F87222297A2C5EA0994/",
  },
  {
    id: 303,
    name: "Eta Cephei",
    wormholes: [2, 4],
    victoryPoints: 2,
    population: [
      {
        resource: "money",
        advanced: true,
      },
      {
        resource: "science",
        advanced: true,
      },
      {
        resource: "gray",
        advanced: false,
      },
    ],
    ancients: 1,
    artifacts: 1,
    discovery: true,
    warpPortal: false,
    guardian: false,
    gcds: false,
    homeArrow: null,
    source:
      "https://images.steamusercontent.com/ugc/1267149075135795731/4DEFAF0D88F831CDCB0EF3D5A19648A6D56523A1/",
  },
  {
    id: 304,
    name: "Theta Pegasi",
    wormholes: [1, 4],
    victoryPoints: 2,
    population: [
      {
        resource: "money",
        advanced: true,
      },
      {
        resource: "materials",
        advanced: false,
      },
    ],
    ancients: 0,
    artifacts: 0,
    discovery: false,
    warpPortal: false,
    guardian: false,
    gcds: false,
    homeArrow: null,
    source:
      "https://images.steamusercontent.com/ugc/1267149075135794684/7FB338C5AD07745230B4F7CA974C95A421D70F1E/",
  },
  {
    id: 305,
    name: "Lambda Serpentis",
    wormholes: [0, 1, 4],
    victoryPoints: 1,
    population: [
      {
        resource: "science",
        advanced: false,
      },
      {
        resource: "materials",
        advanced: false,
      },
    ],
    ancients: 1,
    artifacts: 0,
    discovery: true,
    warpPortal: false,
    guardian: false,
    gcds: false,
    homeArrow: null,
    source:
      "https://images.steamusercontent.com/ugc/1267149075135796314/7F0AF8F5231C8AE7B08CF342E9D70A2DBF16459C/",
  },
  {
    id: 306,
    name: "Beta Centauri",
    wormholes: [0, 4],
    victoryPoints: 1,
    population: [
      {
        resource: "money",
        advanced: false,
      },
      {
        resource: "materials",
        advanced: false,
      },
    ],
    ancients: 0,
    artifacts: 0,
    discovery: false,
    warpPortal: false,
    guardian: false,
    gcds: false,
    homeArrow: null,
    source:
      "https://images.steamusercontent.com/ugc/1267149075135798679/E0851B080378B50765EFCF35CF56855385BD440B/",
  },
  {
    id: 307,
    name: "Sigma Sagittarii",
    wormholes: [1, 4, 5],
    victoryPoints: 2,
    population: [
      {
        resource: "money",
        advanced: false,
      },
      {
        resource: "science",
        advanced: true,
      },
    ],
    ancients: 0,
    artifacts: 0,
    discovery: false,
    warpPortal: false,
    guardian: false,
    gcds: false,
    homeArrow: null,
    source:
      "https://images.steamusercontent.com/ugc/1267149075135797961/43F8A88348225C3F8379E4ADAD0CCD5753196EBA/",
  },
  {
    id: 308,
    name: "Kappa Scorpii",
    wormholes: [2, 4, 5],
    victoryPoints: 2,
    population: [
      {
        resource: "science",
        advanced: false,
      },
      {
        resource: "materials",
        advanced: true,
      },
    ],
    ancients: 0,
    artifacts: 0,
    discovery: false,
    warpPortal: false,
    guardian: false,
    gcds: false,
    homeArrow: null,
    source:
      "https://images.steamusercontent.com/ugc/1267149075135799437/25F5826FD75445A8E4DD98576B6BF69496797825/",
  },
  {
    id: 309,
    name: "Phi Piscium",
    wormholes: [1, 2, 4],
    victoryPoints: 2,
    population: [
      {
        resource: "money",
        advanced: false,
      },
      {
        resource: "science",
        advanced: true,
      },
    ],
    ancients: 0,
    artifacts: 0,
    discovery: false,
    warpPortal: false,
    guardian: false,
    gcds: false,
    homeArrow: null,
    source:
      "https://images.steamusercontent.com/ugc/1267149075135795414/933BDAD301F473F0E3BCAB498ECB2ED8A62AF913/",
  },
  {
    id: 310,
    name: "Nu Phoenicis",
    wormholes: [1, 4],
    victoryPoints: 1,
    population: [
      {
        resource: "science",
        advanced: false,
      },
      {
        resource: "materials",
        advanced: false,
      },
    ],
    ancients: 0,
    artifacts: 0,
    discovery: false,
    warpPortal: false,
    guardian: false,
    gcds: false,
    homeArrow: null,
    source:
      "https://images.steamusercontent.com/ugc/1267149075135795049/BE928739D69EC14809C3990812C16DBC0B44BCEF/",
  },
  {
    id: 311,
    name: "Canopus",
    wormholes: [1, 4, 5],
    victoryPoints: 1,
    population: [
      {
        resource: "materials",
        advanced: false,
      },
    ],
    ancients: 0,
    artifacts: 0,
    discovery: true,
    warpPortal: false,
    guardian: false,
    gcds: false,
    homeArrow: null,
    source:
      "https://images.steamusercontent.com/ugc/1267149075135797558/5823E8385A2699921BC015B21BEB7C1B70C7D2CC/",
  },
  {
    id: 312,
    name: "Antares",
    wormholes: [0, 1, 4],
    victoryPoints: 1,
    population: [
      {
        resource: "materials",
        advanced: false,
      },
    ],
    ancients: 0,
    artifacts: 0,
    discovery: true,
    warpPortal: false,
    guardian: false,
    gcds: false,
    homeArrow: null,
    source:
      "https://images.steamusercontent.com/ugc/1267149075135797176/DFDB848E26AB64064B06D92EA9CB5CED45A0B5A1/",
  },
  {
    id: 313,
    name: "Alpha Ursae Minoris",
    wormholes: [1, 4],
    victoryPoints: 1,
    population: [
      {
        resource: "gray",
        advanced: false,
      },
    ],
    ancients: 0,
    artifacts: 0,
    discovery: true,
    warpPortal: false,
    guardian: false,
    gcds: false,
    homeArrow: null,
    source:
      "https://images.steamusercontent.com/ugc/1267149075135794342/D289CF9BD4C3CC99583543694C6B9FCAE284A5C7/",
  },
  {
    id: 314,
    name: "Spica",
    wormholes: [3, 4, 5],
    victoryPoints: 1,
    population: [
      {
        resource: "gray",
        advanced: false,
      },
    ],
    ancients: 0,
    artifacts: 0,
    discovery: true,
    warpPortal: false,
    guardian: false,
    gcds: false,
    homeArrow: null,
    source:
      "https://images.steamusercontent.com/ugc/1267149075135801049/FCBC437D35A4033C48B2F42A65334343146509FD/",
  },
  {
    id: 315,
    name: "Epsilon Aurigae",
    wormholes: [1, 2, 4],
    victoryPoints: 1,
    population: [],
    ancients: 0,
    artifacts: 0,
    discovery: true,
    warpPortal: false,
    guardian: false,
    gcds: false,
    homeArrow: null,
    source:
      "https://images.steamusercontent.com/ugc/1267149075135799743/63D759885A04FAC47924E2EA2ECA4E6E20D422BE/",
  },
  {
    id: 316,
    name: "Iota Carinae",
    wormholes: [0, 1, 4],
    victoryPoints: 1,
    population: [],
    ancients: 0,
    artifacts: 0,
    discovery: true,
    warpPortal: false,
    guardian: false,
    gcds: false,
    homeArrow: null,
    source:
      "https://images.steamusercontent.com/ugc/1267149075135798999/FC4F0CBB3B73FD9B716C68F27AE734C3C373EFDD/",
  },
  {
    id: 317,
    name: "Beta Crucis",
    wormholes: [3, 4],
    victoryPoints: 2,
    population: [
      {
        resource: "money",
        advanced: false,
      },
      {
        resource: "money",
        advanced: true,
      },
    ],
    ancients: 0,
    artifacts: 0,
    discovery: false,
    warpPortal: false,
    guardian: false,
    gcds: false,
    homeArrow: null,
    source:
      "https://images.steamusercontent.com/ugc/1267149075135801475/2301A079C755F263BE6072054C0B26CC46962111/",
  },
  {
    id: 318,
    name: "Gamma Velorum",
    wormholes: [4, 5],
    victoryPoints: 1,
    population: [
      {
        resource: "materials",
        advanced: true,
      },
      {
        resource: "gray",
        advanced: false,
      },
    ],
    ancients: 0,
    artifacts: 0,
    discovery: false,
    warpPortal: false,
    guardian: false,
    gcds: false,
    homeArrow: null,
    source:
      "https://images.steamusercontent.com/ugc/1267149075135800482/5FA34BFD2206896E5924FD31E778AE646C454EB2/",
  },
  {
    id: 381,
    name: "Beta Sextantis",
    wormholes: [1, 3, 4],
    victoryPoints: 1,
    population: [
      {
        resource: "money",
        advanced: false,
      },
      {
        resource: "materials",
        advanced: false,
      },
    ],
    ancients: 0,
    artifacts: 0,
    discovery: true,
    warpPortal: true,
    guardian: false,
    gcds: false,
    homeArrow: null,
    source:
      "https://images.steamusercontent.com/ugc/1267149075135798324/FEDD83C58C55E1E53C07FA7355160CC944B7EE12/",
  },
  {
    id: 382,
    name: "Zeta Chamaeleontis",
    wormholes: [1, 4, 5],
    victoryPoints: 1,
    population: [
      {
        resource: "science",
        advanced: false,
      },
      {
        resource: "materials",
        advanced: false,
      },
    ],
    ancients: 0,
    artifacts: 0,
    discovery: true,
    warpPortal: true,
    guardian: false,
    gcds: false,
    homeArrow: null,
    source:
      "https://images.steamusercontent.com/ugc/1267149075135793543/60EB3911D8EAB7CD27E59B52DC14239DC903E2C4/",
  },
  {
    id: 233, name: "47 Ursae Majoris", wormholes: [0, 1, 3, 4], victoryPoints: 3,
    population: [
      { resource: "materials", advanced: false },
      { resource: "science", advanced: true },
      { resource: "money", advanced: true },
    ],
    ancients: 0, artifacts: 1, discovery: false, warpPortal: false,
    guardian: false, gcds: false, homeArrow: 1,
    source: ".second-dawn/faction-research/originals/Outcasts and Seekers/02 Warden of Magellan Seekers.jpg",
  },
  {
    id: 234, name: "Eta Geminorum", wormholes: [0, 1, 3, 4], victoryPoints: 3,
    population: [
      { resource: "money", advanced: true },
      { resource: "materials", advanced: true },
      { resource: "materials", advanced: false },
    ],
    ancients: 0, artifacts: 1, discovery: false, warpPortal: false,
    guardian: false, gcds: false, homeArrow: 1,
    source: ".second-dawn/faction-research/originals/Outcasts and Seekers/04 The Exiles Outcasts starting sector.jpg",
  },
  {
    id: 236, name: "Rho Indi", wormholes: [0, 1, 3, 4], victoryPoints: 0,
    population: [
      { resource: "money", advanced: true },
      { resource: "money", advanced: false },
      { resource: "science", advanced: true },
      { resource: "materials", advanced: false },
    ],
    ancients: 0, artifacts: 1, discovery: false, warpPortal: false,
    guardian: false, gcds: false, homeArrow: 1,
    source: ".second-dawn/faction-research/originals/Outcasts and Seekers/03 Rho indi syndicate Outcasts starting sector.jpg",
  },
  {
    id:238,name:'Beta Lyrae',wormholes:[0,1,3,4],victoryPoints:3,
    population:[
      {resource:'materials',advanced:false},
      {resource:'science',advanced:true},
      {resource:'science',advanced:true},
      {resource:'money',advanced:false},
    ],
    ancients:0,artifacts:1,discovery:false,warpPortal:false,
    guardian:false,gcds:false,homeArrow:1,
    source:'.second-dawn/faction-research/originals/Outcasts and Seekers/01 Enlightened of Lyra Seekers board.jpg',
  },
  {
    id: 277, name: "Phrygia - Ionys", wormholes: [0, 1, 3, 4], victoryPoints: 3,
    population: [
      { resource: "gray", advanced: false },
      { resource: "money", advanced: true },
      { resource: "science", advanced: true },
    ],
    ancients: 0, artifacts: 1, discovery: false, warpPortal: false,
    guardian: false, gcds: false, homeArrow: 1,
    source: ".second-dawn/faction-research/originals/NEW FACTIONS/03 Starting Sectors/New Starting Sectors print sheet03.jpg",
  },
  {
    id: 299, name: "Yggdrasil", wormholes: [0, 1, 3, 4], victoryPoints: 3,
    population: [
      { resource: "money", advanced: true },
      { resource: "money", advanced: false },
      { resource: "science", advanced: false },
    ],
    ancients: 0, artifacts: 1, discovery: false, warpPortal: false,
    guardian: false, gcds: false, homeArrow: 1,
    source: ".second-dawn/faction-research/originals/NEW FACTIONS/03 Starting Sectors/New Starting Sectors print sheet03.jpg",
  },
];

export function sectorDefinition(id: number): SectorDefinition | undefined {
  return SECTORS.find((sector) => sector.id === id);
}
