export interface SurveyQuestion {
  id: string;
  text: string;
  weights: {
    democrat: number;
    republican: number;
    libertarian: number;
    green: number;
    independent: number;
  };
}

export type SurveyAnswer = 'agree' | 'neutral' | 'disagree';

export const SURVEY_QUESTIONS: SurveyQuestion[] = [
  {
    id: 'q1',
    text: 'The government should provide universal healthcare coverage for all citizens.',
    weights: { democrat: 2, republican: -2, libertarian: -1, green: 2, independent: 0 },
  },
  {
    id: 'q2',
    text: 'Lower taxes are more important than increased public services.',
    weights: { democrat: -2, republican: 2, libertarian: 2, green: -2, independent: 0 },
  },
  {
    id: 'q3',
    text: 'Climate change legislation should be a top government priority.',
    weights: { democrat: 2, republican: -1, libertarian: -1, green: 3, independent: 0 },
  },
  {
    id: 'q4',
    text: 'Gun ownership rights should be protected with minimal restrictions.',
    weights: { democrat: -2, republican: 2, libertarian: 3, green: -2, independent: 0 },
  },
  {
    id: 'q5',
    text: 'Immigration policy should prioritize a path to citizenship for undocumented residents.',
    weights: { democrat: 2, republican: -2, libertarian: 0, green: 1, independent: 0 },
  },
  {
    id: 'q6',
    text: 'The government should regulate large technology companies more strictly.',
    weights: { democrat: 1, republican: 0, libertarian: -2, green: 2, independent: 1 },
  },
  {
    id: 'q7',
    text: 'Military spending should be increased to ensure national security.',
    weights: { democrat: -1, republican: 2, libertarian: -2, green: -2, independent: 0 },
  },
  {
    id: 'q8',
    text: 'Public education funding should be significantly increased.',
    weights: { democrat: 2, republican: -1, libertarian: -1, green: 2, independent: 1 },
  },
  {
    id: 'q9',
    text: 'Marijuana should be fully legalized at the federal level.',
    weights: { democrat: 1, republican: -1, libertarian: 3, green: 2, independent: 1 },
  },
  {
    id: 'q10',
    text: 'Corporations have too much influence in politics and elections.',
    weights: { democrat: 2, republican: 0, libertarian: 1, green: 3, independent: 2 },
  },
];

export function computeSurveyScores(answers: Record<string, SurveyAnswer>) {
  const partyScores: Record<string, number> = {
    democrat: 0,
    republican: 0,
    libertarian: 0,
    green: 0,
    independent: 0,
  };
  const maxPossible: Record<string, number> = {
    democrat: 0,
    republican: 0,
    libertarian: 0,
    green: 0,
    independent: 0,
  };

  for (const q of SURVEY_QUESTIONS) {
    const answer = answers[q.id];
    const multiplier = answer === 'agree' ? 1 : answer === 'disagree' ? -1 : 0;

    for (const [party, weight] of Object.entries(q.weights)) {
      partyScores[party] += weight * multiplier;
      maxPossible[party] += Math.abs(weight);
    }
  }

  const alignmentRadar: Record<string, number> = {};
  for (const party of Object.keys(partyScores)) {
    const max = maxPossible[party] || 1;
    alignmentRadar[party] = Math.round(((partyScores[party] + max) / (2 * max)) * 100);
  }

  const leftScore = (partyScores.democrat + partyScores.green) / 2;
  const rightScore = (partyScores.republican + partyScores.libertarian) / 2;
  const maxLeft = (maxPossible.democrat + maxPossible.green) / 2;
  const maxRight = (maxPossible.republican + maxPossible.libertarian) / 2;
  const maxRange = Math.max(maxLeft, maxRight) || 1;
  const raw = rightScore - leftScore;
  const spectrumScore = Math.round(((raw + maxRange) / (2 * maxRange)) * 100);

  return {
    spectrumScore: Math.max(0, Math.min(100, spectrumScore)),
    alignmentRadar,
  };
}
