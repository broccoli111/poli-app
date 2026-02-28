import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, Typography } from './theme';

interface RadarChartProps {
  data: Record<string, number>; // party -> 0-100
}

export function RadarChart({ data }: RadarChartProps) {
  const entries = Object.entries(data);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Party Alignment</Text>
      {entries.map(([party, value]) => (
        <View key={party} style={styles.row}>
          <Text style={styles.label}>{party.charAt(0).toUpperCase() + party.slice(1)}</Text>
          <View style={styles.barOuter}>
            <View style={[styles.barInner, { width: `${Math.max(0, Math.min(100, value))}%` }]} />
          </View>
          <Text style={styles.value}>{Math.round(value)}%</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginVertical: Spacing.md },
  title: { ...Typography.h3, marginBottom: Spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  label: { ...Typography.bodySmall, width: 100, color: Colors.textPrimary },
  barOuter: {
    flex: 1,
    height: 16,
    backgroundColor: Colors.border,
    borderRadius: 8,
    marginHorizontal: Spacing.sm,
    overflow: 'hidden',
  },
  barInner: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 8,
  },
  value: { ...Typography.caption, color: Colors.textSecondary, width: 40, textAlign: 'right' },
});
