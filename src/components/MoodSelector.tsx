// src/components/MoodSelector.tsx
'use client';

import { UnstyledButton, Text, Group } from '@mantine/core';

const moods = [
    { emoji: '😊', label: 'Great', value: 'great' },
    { emoji: '🙂', label: 'Good', value: 'good' },
    { emoji: '😐', label: 'Okay', value: 'okay' },
    { emoji: '🙁', label: 'Bad', value: 'bad' },
    { emoji: '😞', label: 'Awful', value: 'awful' },
];

// 1. Define props for the component
interface MoodSelectorProps {
  value: string | null;
  onChange: (mood: string | null) => void;
}

export function MoodSelector({ value, onChange }: MoodSelectorProps) {
  // 2. We no longer use useState here. The state is passed in via props.

  return (
    <Group gap="xs" wrap="wrap" grow>
      {moods.map((mood) => (
        <UnstyledButton
          key={mood.value}
          // 3. Call the onChange function from props
          onClick={() => onChange(mood.value)}
          style={(theme) => ({
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: theme.spacing.sm,
            borderRadius: theme.radius.xl,
            border: `1px solid ${theme.colors.gray[3]}`,
            // 4. Check against the `value` prop
            backgroundColor: value === mood.value ? theme.colors[theme.primaryColor][0] : 'transparent',
            transition: 'all 0.1s ease',
            flex: '1 1 0%',
            minWidth: '60px',
            transform: value === mood.value ? 'scale(1.05)' : 'scale(1)',
            '&:hover': {
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