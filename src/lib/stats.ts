export function intensity(hours: number): 0 | 1 | 2 | 3 | 4 {
  if (hours <= 0) return 0;
  if (hours < 3) return 1;
  if (hours < 6) return 2;
  if (hours < 9) return 3;
  return 4;
}
export function intensityFrom(hours: number, floor: number, top: number): 0 | 1 | 2 | 3 | 4 {
  if (hours < floor) return 0;
  const span = Math.max(top - floor, 1);
  const step = Math.min(Math.floor(((hours - floor) / span) * 4) + 1, 4);
  return step as 1 | 2 | 3 | 4;
}
