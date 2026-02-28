/**
 * Scoring utility: updates user sentiment scores with a bounded nudge
 * based on their spectrum alignment vs the bill's policy tags.
 * 
 * The algorithm is intentionally opaque in the UI; this module is internal only.
 */

const NUDGE_FACTOR = 0.05;
const MIN_SCORE = 0;
const MAX_SCORE = 100;

export function computeVoteScore(
  spectrumScore: number,
  vote: 'support' | 'oppose' | 'neutral'
): number {
  const voteMultiplier = vote === 'support' ? 1 : vote === 'oppose' ? -1 : 0;
  return spectrumScore + voteMultiplier * NUDGE_FACTOR * (MAX_SCORE - MIN_SCORE);
}

export function computeFinalScore(
  currentSpectrum: number,
  voteScore: number
): number {
  const blended = currentSpectrum * 0.95 + voteScore * 0.05;
  return Math.max(MIN_SCORE, Math.min(MAX_SCORE, Math.round(blended * 100) / 100));
}

export function computeParticipationRate(
  totalVotes: number,
  populationTotal: number
): number {
  if (populationTotal <= 0) return 0;
  return Math.round((totalVotes / populationTotal) * 10000) / 100;
}
