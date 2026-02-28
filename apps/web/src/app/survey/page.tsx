'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Nav } from '@/components/Nav';
import { RequireAuth } from '@/components/RequireAuth';
import { useAuth } from '@/lib/auth-context';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import { SURVEY_QUESTIONS, computeSurveyScores, type SurveyAnswer } from '@poli/types';

export default function SurveyPage() {
  return (
    <RequireAuth>
      <Nav />
      <SurveyContent />
    </RequireAuth>
  );
}

function SurveyContent() {
  const { user, refreshProfile } = useAuth();
  const supabase = getSupabaseBrowserClient();
  const router = useRouter();

  const [answers, setAnswers] = useState<Record<string, SurveyAnswer>>({});
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState<{ spectrumScore: number; alignmentRadar: Record<string, number> } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAnswer = (qId: string, answer: SurveyAnswer) => {
    setAnswers((prev) => ({ ...prev, [qId]: answer }));
  };

  const handleSubmit = async () => {
    if (!user) return;
    setLoading(true);

    const scores = computeSurveyScores(answers);
    setResults(scores);

    await supabase.from('survey_responses').insert({
      user_id: user.id,
      responses: answers,
      spectrum_score: scores.spectrumScore,
      alignment_radar: scores.alignmentRadar,
    });

    await supabase
      .from('profiles')
      .update({
        spectrum_score: scores.spectrumScore,
        alignment_radar: scores.alignmentRadar,
      })
      .eq('id', user.id);

    await refreshProfile();
    setSubmitted(true);
    setLoading(false);
  };

  const allAnswered = SURVEY_QUESTIONS.every((q) => answers[q.id]);

  if (submitted && results) {
    return (
      <div className="container" style={{ maxWidth: 600 }}>
        <h2 style={{ marginBottom: 16 }}>Your Political Alignment</h2>

        <div className="card">
          <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Political Spectrum</p>
          <div className="flex justify-between" style={{ fontSize: 12, marginBottom: 4 }}>
            <span>Progressive</span>
            <span>Moderate</span>
            <span>Conservative</span>
          </div>
          <div className="spectrum-bar">
            <div className="spectrum-marker" style={{ left: `${results.spectrumScore}%` }} />
          </div>
        </div>

        <div className="card">
          <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Party Alignment</p>
          {Object.entries(results.alignmentRadar).map(([party, value]) => (
            <div key={party} className="radar-row">
              <span className="radar-label">{party.charAt(0).toUpperCase() + party.slice(1)}</span>
              <div className="radar-bar-outer">
                <div className="radar-bar-inner" style={{ width: `${value}%` }} />
              </div>
              <span className="radar-value">{Math.round(value)}%</span>
            </div>
          ))}
        </div>

        <button className="btn btn-primary w-full" onClick={() => router.push('/')}>
          Go to Bills
        </button>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: 600 }}>
      <h2 style={{ marginBottom: 8 }}>Policy Survey</h2>
      <p className="text-secondary mb-4">Answer 10 questions to see where you stand.</p>

      {SURVEY_QUESTIONS.map((q, i) => (
        <div key={q.id} className="card">
          <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Question {i + 1}</p>
          <p style={{ marginBottom: 12 }}>{q.text}</p>
          <div className="flex gap-2">
            {(['agree', 'neutral', 'disagree'] as SurveyAnswer[]).map((a) => (
              <button
                key={a}
                className={`btn btn-sm ${answers[q.id] === a ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => handleAnswer(q.id, a)}
              >
                {a.charAt(0).toUpperCase() + a.slice(1)}
              </button>
            ))}
          </div>
        </div>
      ))}

      <button
        className="btn btn-primary w-full mt-4"
        onClick={handleSubmit}
        disabled={!allAnswered || loading}
      >
        {loading ? 'Computing...' : 'See Results'}
      </button>
    </div>
  );
}
