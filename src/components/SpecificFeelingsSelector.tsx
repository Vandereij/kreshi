// src/components/SpecificFeelingsSelector.tsx (Corrected)
'use client';

import { useState } from 'react';
import { Button, Group } from '@mantine/core';

const feelings = [
  'Anxious', 'Stressed', 'Happy', 'Grateful', 'Tired', 'Hopeful', 'Irritated'
];

export function SpecificFeelingsSelector() {
  const [selectedFeelings, setSelectedFeelings] = useState<string[]>([]);

  const toggleFeeling = (feeling: string) => {
    setSelectedFeelings((current) =>
      current.includes(feeling)
        ? current.filter((f) => f !== feeling)
        : [...current, feeling]
    );
  };

  return (
    // THE FIX IS HERE: 'spacing' has been renamed to 'gap'
    <Group gap="xs" wrap="wrap">
      {feelings.map((feeling) => (
        <Button
          key={feeling}
          variant={selectedFeelings.includes(feeling) ? 'filled' : 'light'}
          color={selectedFeelings.includes(feeling) ? 'blue' : 'gray'}
          radius="xl"
          onClick={() => toggleFeeling(feeling)}
          size="sm"
          style={(theme) => ({
            transition: 'all 0.1s ease',
            '&:hover': {
              transform: 'scale(1.02)',
            },
          })}
        >
          {feeling}
        </Button>
      ))}
    </Group>
  );
}