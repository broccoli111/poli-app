import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, Typography } from './theme';

interface ChipProps {
  label: string;
  color?: string;
}

export function Chip({ label, color = Colors.primaryLight }: ChipProps) {
  return (
    <View style={[styles.chip, { backgroundColor: color }]}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm + 2,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  text: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '500',
  },
});
