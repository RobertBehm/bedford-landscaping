export function isoDate(d: Date) {
  // Stable across SSR/client
  return d.toISOString().slice(0, 10);
}

export function isoDateTime(d: Date) {
  return d.toISOString();
}

export function addDays(base: Date, days: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

export function subDays(base: Date, days: number) {
  return addDays(base, -days);
}

export function msToDays(ms: number) {
  return ms / (1000 * 60 * 60 * 24);
}

export function daysBetween(from: Date, to: Date) {
  return Math.floor(msToDays(to.getTime() - from.getTime()));
}
