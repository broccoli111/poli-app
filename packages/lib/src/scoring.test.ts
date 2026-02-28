import { describe, it, expect } from 'vitest';
import { computeVoteScore, computeFinalScore, computeParticipationRate } from './scoring';

describe('computeVoteScore', () => {
  it('nudges score up for support', () => {
    const result = computeVoteScore(50, 'support');
    expect(result).toBeGreaterThan(50);
  });

  it('nudges score down for oppose', () => {
    const result = computeVoteScore(50, 'oppose');
    expect(result).toBeLessThan(50);
  });

  it('keeps score same for neutral', () => {
    const result = computeVoteScore(50, 'neutral');
    expect(result).toBe(50);
  });
});

describe('computeFinalScore', () => {
  it('blends current spectrum with vote score', () => {
    const result = computeFinalScore(50, 60);
    expect(result).toBeGreaterThan(49);
    expect(result).toBeLessThan(60);
  });

  it('clamps to 0-100', () => {
    expect(computeFinalScore(0, -100)).toBe(0);
    expect(computeFinalScore(100, 200)).toBe(100);
  });
});

describe('computeParticipationRate', () => {
  it('computes correct percentage', () => {
    expect(computeParticipationRate(500, 10000)).toBe(5);
  });

  it('returns 0 for zero population', () => {
    expect(computeParticipationRate(100, 0)).toBe(0);
  });

  it('rounds to 2 decimal places', () => {
    expect(computeParticipationRate(333, 10000)).toBe(3.33);
  });
});
