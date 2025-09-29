// src/components/MoodSelector.tsx (Corrected)

'use client';

import { useState } from 'react';
import { UnstyledButton, Text, Group } from '@mantine/core';

const moods = [
    { emoji: '😊', label: 'Great', value: 'great' },
    { emoji: '🙂', label: 'Good', value: 'good' },
    { emoji: '😐', label: 'Okay', value: 'okay' },
    { emoji: '🙁', label: 'Bad', value: 'bad' },
    { emoji: '😞', label: 'Awful', value: 'awful' },
];

export function MoodSelector() {
  const [selectedMood, setSelectedMood] = useState<string | null>(null);

  return (
    <Group gap="xs" wrap="wrap" grow>
      {moods.map((mood) => (
        <UnstyledButton
          key={mood.value}
          onClick={() => setSelectedMood(mood.value)}
          style={(theme) => ({
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: theme.spacing.sm,
            borderRadius: theme.radius.xl,
            border: `1px solid ${theme.colors.gray[3]}`,
            // THE FIX IS HERE: Replaced theme.fn.primaryColor(0)
            backgroundColor: selectedMood === mood.value ? theme.colors[theme.primaryColor][0] : 'transparent',
            transition: 'all 0.1s ease',
            flex: '1 1 0%',
            minWidth: '60px',
            transform: selectedMood === mood.value ? 'scale(1.05)' : 'scale(1)',
            '&:hover': {
              // AND ALSO HERE
              backgroundColor: theme.colors.gray[1],
              transform: 'scale(1.02)',
            },
          })}
        >
          <Text size="xl" style={{ fontSize: '2.5rem' }}>
            {mood.emoji}
          </Text>
        </UnstyledButton>
      ))}
    </Group>
  );
}