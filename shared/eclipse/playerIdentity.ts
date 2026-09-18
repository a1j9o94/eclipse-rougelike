export interface PlayerProfile {
  username: string;
  pinEnabled: boolean;
}

export interface PlayerRegistration {
  profile: PlayerProfile;
  /** Shown once after registration; only its hash is persisted. */
  recoveryCode: string;
}

export interface PlayerLogin {
  credential: string;
  profile: PlayerProfile;
}

export function normalizePlayerName(username: string): string {
  return username.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function playerNameForRegistration(username: string): string {
  const trimmed = username.trim().replace(/\s+/g, ' ');
  if (!/^[a-zA-Z0-9][a-zA-Z0-9 _-]{2,23}$/.test(trimmed)) {
    throw new Error('Player name must have 3–24 letters, numbers, spaces, underscores, or hyphens.');
  }
  return trimmed;
}

export function validatePlayerPin(pin: string): void {
  if (!/^\d{6,12}$/.test(pin)) throw new Error('PIN must contain 6–12 digits.');
}

export function normalizeRecoveryCode(code: string): string | null {
  const normalized = code.replace(/[\s-]/g, '').toLowerCase();
  return /^[a-f0-9]{32}$/.test(normalized) ? normalized : null;
}
