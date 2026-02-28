import { describe, it, expect } from 'vitest';
import { computeSurveyScores, SURVEY_QUESTIONS, type SurveyAnswer } from './survey';

describe('computeSurveyScores', () => {
  it('returns score 50 for all neutral answers', () => {
    const answers: Record<string, SurveyAnswer> = {};
    for (const q of SURVEY_QUESTIONS) answers[q.id] = 'neutral';
    const result = computeSurveyScores(answers);
    expect(result.spectrumScore).toBe(50);
    for (const val of Object.values(result.alignmentRadar)) {
      expect(val).toBe(50);
    }
  });

  it('returns high score for all conservative answers', () => {
    const answers: Record<string, SurveyAnswer> = {};
    for (const q of SURVEY_QUESTIONS) {
      const repWeight = q.weights.republican;
      answers[q.id] = repWeight > 0 ? 'agree' : repWeight < 0 ? 'disagree' : 'neutral';
    }
    const result = computeSurveyScores(answers);
    expect(result.spectrumScore).toBeGreaterThan(60);
    expect(result.alignmentRadar.republican).toBeGreaterThan(70);
  });

  it('returns low score for all progressive answers', () => {
    const answers: Record<string, SurveyAnswer> = {};
    for (const q of SURVEY_QUESTIONS) {
      const demWeight = q.weights.democrat;
      answers[q.id] = demWeight > 0 ? 'agree' : demWeight < 0 ? 'disagree' : 'neutral';
    }
    const result = computeSurveyScores(answers);
    expect(result.spectrumScore).toBeLessThan(40);
    expect(result.alignmentRadar.democrat).toBeGreaterThan(70);
  });

  it('clamps score between 0 and 100', () => {
    const extreme: Record<string, SurveyAnswer> = {};
    for (const q of SURVEY_QUESTIONS) extreme[q.id] = 'agree';
    const result = computeSurveyScores(extreme);
    expect(result.spectrumScore).toBeGreaterThanOrEqual(0);
    expect(result.spectrumScore).toBeLessThanOrEqual(100);
    for (const val of Object.values(result.alignmentRadar)) {
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThanOrEqual(100);
    }
  });

  it('handles empty answers gracefully', () => {
    const result = computeSurveyScores({});
    expect(result.spectrumScore).toBe(50);
  });
});
