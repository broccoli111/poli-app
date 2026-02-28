import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, Typography } from './theme';

interface SentimentBarProps {
  support: number;
  oppose: number;
  neutral: number;
  total: number;
  participationRate?: number;
}

export function SentimentBar({ support, oppose, neutral, total, participationRate }: SentimentBarProps) {
  const pctSupport = total > 0 ? (support / total) * 100 : 0;
  const pctOppose = total > 0 ? (oppose / total) * 100 : 0;
  const pctNeutral = total > 0 ? (neutral / total) * 100 : 0;

  return (
    <View style={styles.container}>
      <View style={styles.barOuter}>
        {pctSupport > 0 && (
          <View style={[styles.segment, { width: `${pctSupport}%`, backgroundColor: Colors.support }]} />
        )}
        {pctNeutral > 0 && (
          <View style={[styles.segment, { width: `${pctNeutral}%`, backgroundColor: Colors.neutral }]} />
        )}
        {pctOppose > 0 && (
          <View style={[styles.segment, { width: `${pctOppose}%`, backgroundColor: Colors.oppose }]} />
        )}
      </View>
      <View style={styles.legend}>
        <Text style={[styles.legendText, { color: Colors.support }]}>Support {Math.round(pctSupport)}%</Text>
        <Text style={[styles.legendText, { color: Colors.neutral }]}>Neutral {Math.round(pctNeutral)}%</Text>
        <Text style={[styles.legendText, { color: Colors.oppose }]}>Oppose {Math.round(pctOppose)}%</Text>
      </View>
      <Text style={styles.total}>{total} votes</Text>
      {participationRate !== undefined && (
        <Text style={styles.participation}>District participation: {participationRate}%</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginVertical: Spacing.sm },
  barOuter: {
    flexDirection: 'row',
    height: 20,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: Colors.border,
  },
  segment: { height: '100%' },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  legendText: { ...Typography.caption, fontWeight: '500' },
  total: { ...Typography.caption, color: Colors.textMuted, marginTop: 2 },
  participation: { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },
});
