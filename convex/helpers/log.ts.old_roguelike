export function logInfo(tag: string, msg: string, extra?: Record<string, unknown>) {
  const line = extra ? `${msg} | ${JSON.stringify(extra)}` : msg;
  // Convex logs appear in the server terminal / dashboard
  console.log(`[${tag}] ${line}`);
}

export function roomTag(roomId: string, round?: number) {
  return `room:${roomId}${round ? `#r${round}` : ''}`;
}
