// src/components/AiInsightCard.tsx
'use client';

import { Paper, Text } from '@mantine/core';

export function AiInsightCard() {
  return (
    <Paper
      p="md"
      radius="md"
      style={(theme) => ({
        backgroundColor: theme.colors['brand-beige'][1],
        border: 'none',
      })}
    >
      <Text size="sm" ta="center">
        It looks like your mood tends to dip on Tuesday mornings. Is there anything specific that happens mid-week?
      </Text>
    </Paper>
  );
}