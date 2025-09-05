export function assertEnv(required: string[], env: Record<string, string | undefined> = process.env): void {
  const missing = required.filter((k) => !env[k] || env[k] === "");
  if (missing.length > 0) {
    const list = missing.join(", ");
    throw new Error(`Missing required environment variables: ${list}`);
  }
}

export function hasEnv(required: string[], env: Record<string, string | undefined> = process.env): boolean {
  return required.every((k) => !!env[k] && env[k] !== "");
}

