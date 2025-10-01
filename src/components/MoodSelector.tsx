// src/components/MoodSelector.tsx
'use client';

import { UnstyledButton, Text, Group } from '@mantine/core';

// Emojis and their specific background colors from the design
const moods = [
  { emoji: '😊', value: 'great', color: '#FFF4D4' },
  { emoji: '🙂', value: 'good', color: '#FFE6C1' },
  { emoji: '😐', value: 'okay', color: '#F8D6B7' },
  { emoji: '🙁', value: 'bad', color: '#F7C6B4' },
  { emoji: '😞', value: 'awful', color: '#E0EFFF' },
];

interface MoodSelectorProps {
  value: string | null;
  onChange: (mood: string | null) => void;
}

export function MoodSelector({ value, onChange }: MoodSelectorProps) {
  return (
    <Group justify="space-around" grow>
      {moods.map((mood) => (
        <UnstyledButton
          key={mood.value}
          onClick={() => onChange(mood.value)}
          style={(theme) => ({
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '60px',
            width: '60px',
            borderRadius: '50%', // Perfect circle
            backgroundColor: mood.color,
            border: `2px solid ${value === mood.value ? theme.colors.blue[5] : 'transparent'}`,
            transition: 'transform 0.2s ease, border-color 0.2s ease',
            transform: value === mood.value ? 'scale(1.1)' : 'scale(1)',
          })}
        >
          <Text style={{ fontSize: '2.5rem' }}>
            {mood.emoji}
          </Text>
        </UnstyledButton>
      ))}
    </Group>
  );
}