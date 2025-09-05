const SPACE_ADJECTIVES = [
  'Nebular', 'Stellar', 'Cosmic', 'Galactic', 'Solar',
  'Lunar', 'Astral', 'Orbital', 'Binary', 'Quantum',
  'Celestial', 'Void', 'Photon', 'Plasma', 'Fusion',
  'Neutron', 'Pulsar', 'Quasar', 'Eclipse', 'Corona'
];

const SPACE_NOUNS = [
  'Nexus', 'Station', 'Outpost', 'Gateway', 'Beacon',
  'Observatory', 'Terminal', 'Junction', 'Hub', 'Sector',
  'Depot', 'Platform', 'Complex', 'Base', 'Port',
  'Relay', 'Facility', 'Command', 'Center', 'Array'
];

export function generateSpaceRoomName(): string {
  const adj = SPACE_ADJECTIVES[Math.floor(Math.random() * SPACE_ADJECTIVES.length)];
  const noun = SPACE_NOUNS[Math.floor(Math.random() * SPACE_NOUNS.length)];
  const number = Math.floor(Math.random() * 999) + 1;
  return `${adj} ${noun} ${number}`;
}

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}