export function nowIso() {
  return new Date().toISOString();
}

export function addMinutesIso(minutes: number) {
  const date = new Date();
  date.setMinutes(date.getMinutes() + minutes);
  return date.toISOString();
}
