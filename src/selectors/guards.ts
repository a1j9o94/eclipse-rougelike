export function selectFleetValidity(localValid: boolean, serverValid: boolean | null | undefined): boolean {
  return serverValid == null ? localValid : (serverValid && localValid)
}

