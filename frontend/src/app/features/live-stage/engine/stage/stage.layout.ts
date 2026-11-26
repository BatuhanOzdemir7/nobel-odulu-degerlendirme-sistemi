export const FLOOR_Y = 90;
export const SEAT_Y = 66;   // masanın arkası: bacaklar masayla örtülür
export const FRONT_Y = 88;  // masanın önü: oy verirken / tokmak vururken
export const SLOT = {
  offLeft: { x: -16, y: FLOOR_Y },
  offRight: { x: 116, y: FLOOR_Y },
  organization: { x: 24, y: FLOOR_Y },
  candidate: { x: 50, y: FLOOR_Y },
  committeeCandidate: { x: 24, y: FRONT_Y + 1 },
  podium: { x: 76, y: FLOOR_Y },
} as const;

/** `count` uzmanı masa boyunca ortalı dizer. */
export function seatX(index: number, count: number): number {
  const step = Math.min(18, 62 / Math.max(count, 1));
  return 50 + (index - (count - 1) / 2) * step;
}
