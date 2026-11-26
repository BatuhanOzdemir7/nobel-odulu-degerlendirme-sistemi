import { describe, expect, it } from 'vitest';
import { seatX } from './stage.layout';

describe('Committee seat layout', () => {
  it.each([3, 4, 5, 6, 7])('spaces %i seats symmetrically across the table', (count) => {
    const seats = Array.from({ length: count }, (_, index) => seatX(index, count));
    expect(seats[0]).toBeGreaterThan(14);
    expect(seats.at(-1)).toBeLessThan(86);
    for (let index = 0; index < seats.length; index++) {
      expect(seats[index] + seats[seats.length - 1 - index]).toBeCloseTo(100);
      if (index > 0) expect(seats[index] - seats[index - 1]).toBeGreaterThan(8);
    }
  });
});
