// src/components/AiInsightCard.tsx
'use client';

import { Paper, Text, Anchor, Group } from '@mantine/core';
import { IconBulb } from '@tabler/icons-react'; // Needs @tabler/icons-react

export function AiInsightCard() {
  return (
    <Paper
      shadow="sm"
      p="md"
      radius="md"
      withBorder
      style={(theme) => ({
        backgroundColor: theme.colors.blue[0], // Light blue background
        borderColor: theme.colors.blue[2],
        display: 'flex',
        alignItems: 'flex-start',
        gap: theme.spacing.sm,
      })}
    >
      <IconBulb size={24} style={{ flexShrink: 0, color: '#4c74b9' }} /> {/* A specific blue shade */}
      <div>
        <Text size="sm" color="blue" fw={600} mb={4}>AI Insight</Text>
        <Text size="sm" c="dark.8">
          It looks like your mood tends to dip on Tuesday mornings. Is there anything specific that happens mid-week?
        </Text>
        <Anchor component="button" size="xs" mt="xs" fw={500} style={{ display: 'block' }}>
          Explore this trend
        </Anchor>
      </div>
    </Paper>
  );
}