import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { useAuth } from '../../lib/auth-context';
import { supabase } from '../../lib/supabase';
import { SURVEY_QUESTIONS, computeSurveyScores, type SurveyAnswer } from '@poli/types';

export default function SurveyScreen() {
  const { user, refreshProfile } = useAuth();
  const [answers, setAnswers] = useState<Record<string, SurveyAnswer>>({});
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
      user_id: user.id, responses: answers,
      spectrum_score: scores.spectrumScore, alignment_radar: scores.alignmentRadar,
    });
    await supabase.from('profiles').update({
      spectrum_score: scores.spectrumScore, alignment_radar: scores.alignmentRadar,
    }).eq('id', user.id);
    await refreshProfile();
    setLoading(false);
  };

  const allAnswered = SURVEY_QUESTIONS.every((q) => answers[q.id]);

  if (results) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
        <Text style={styles.heading}>Your Results</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Political Spectrum</Text>
          <View style={styles.spectrumLabels}>
            <Text style={styles.label}>Progressive</Text>
            <Text style={styles.label}>Moderate</Text>
            <Text style={styles.label}>Conservative</Text>
          </View>
          <View style={styles.spectrumBar}>
            <View style={[styles.marker, { left: `${results.spectrumScore}%` }]} />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Party Alignment</Text>
          {Object.entries(results.alignmentRadar).map(([party, val]) => (
            <View key={party} style={styles.radarRow}>
              <Text style={styles.radarLabel}>{party.charAt(0).toUpperCase() + party.slice(1)}</Text>
              <View style={styles.radarBarOuter}>
                <View style={[styles.radarBarInner, { width: `${val}%` }]} />
              </View>
              <Text style={styles.radarVal}>{Math.round(val)}%</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.btn} onPress={() => setResults(null)}>
          <Text style={styles.btnText}>Retake Survey</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.heading}>Policy Survey</Text>
      <Text style={styles.subtitle}>Answer 10 questions to discover your alignment.</Text>

      {SURVEY_QUESTIONS.map((q, i) => (
        <View key={q.id} style={styles.card}>
          <Text style={styles.qNum}>Question {i + 1}</Text>
          <Text style={styles.qText}>{q.text}</Text>
          <View style={styles.answerRow}>
            {(['agree', 'neutral', 'disagree'] as SurveyAnswer[]).map((a) => (
              <TouchableOpacity
                key={a}
                style={[styles.answerBtn, answers[q.id] === a && styles.answerBtnActive]}
                onPress={() => handleAnswer(q.id, a)}
              >
                <Text style={[styles.answerText, answers[q.id] === a && styles.answerTextActive]}>
                  {a.charAt(0).toUpperCase() + a.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}

      <TouchableOpacity
        style={[styles.btn, !allAnswered && styles.btnDisabled]}
        onPress={handleSubmit}
        disabled={!allAnswered || loading}
      >
        <Text style={styles.btnText}>{loading ? 'Computing...' : 'See Results'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  heading: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#6B7280', marginBottom: 16 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  cardTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  qNum: { fontSize: 13, fontWeight: '600', color: '#9CA3AF', marginBottom: 4 },
  qText: { fontSize: 15, marginBottom: 12 },
  answerRow: { flexDirection: 'row', gap: 8 },
  answerBtn: { flex: 1, borderWidth: 1, borderColor: '#2563EB', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  answerBtnActive: { backgroundColor: '#2563EB' },
  answerText: { color: '#2563EB', fontWeight: '500', fontSize: 14 },
  answerTextActive: { color: '#fff' },
  btn: { backgroundColor: '#2563EB', borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginVertical: 16 },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  spectrumLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  label: { fontSize: 12, color: '#9CA3AF' },
  spectrumBar: { height: 24, borderRadius: 12, backgroundColor: '#E5E7EB', position: 'relative' },
  marker: { position: 'absolute', top: 2, width: 20, height: 20, borderRadius: 10, backgroundColor: '#2563EB', marginLeft: -10 },
  radarRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  radarLabel: { width: 100, fontSize: 14 },
  radarBarOuter: { flex: 1, height: 16, backgroundColor: '#E5E7EB', borderRadius: 8, overflow: 'hidden', marginHorizontal: 8 },
  radarBarInner: { height: '100%', backgroundColor: '#2563EB', borderRadius: 8 },
  radarVal: { width: 40, textAlign: 'right', fontSize: 12, color: '#6B7280' },
});
