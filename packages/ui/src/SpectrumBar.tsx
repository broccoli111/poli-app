import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, Typography } from './theme';

interface SpectrumBarProps {
  score: number; // 0 = far left, 100 = far right
}

export function SpectrumBar({ score }: SpectrumBarProps) {
  const clampedScore = Math.max(0, Math.min(100, score));

  return (
    <View style={styles.container}>
      <View style={styles.labels}>
        <Text style={styles.label}>Progressive</Text>
        <Text style={styles.label}>Moderate</Text>
        <Text style={styles.label}>Conservative</Text>
      </View>
      <View style={styles.barOuter}>
        <View style={styles.barGradient}>
          <View style={[styles.marker, { left: `${clampedScore}%` }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginVertical: Spacing.md },
  labels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.xs },
  label: { ...Typography.caption, color: Colors.textMuted },
  barOuter: { height: 24, borderRadius: 12, overflow: 'hidden' },
  barGradient: {
    flex: 1,
    backgroundColor: Colors.border,
    borderRadius: 12,
    position: 'relative',
  },
  marker: {
    position: 'absolute',
    top: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    marginLeft: -10,
  },
});
