// src/components/SpecificFeelingsSelector.tsx
'use client';

import { Button, Group } from '@mantine/core';

const feelings = [ 'Anxious', 'Stressed', 'Happy', 'Grateful', 'Tired', 'Hopeful', 'Irritated' ];

interface SpecificFeelingsSelectorProps {
  value: string[];
  onChange: (feelings: string[]) => void;
}

export function SpecificFeelingsSelector({ value, onChange }: SpecificFeelingsSelectorProps) {
  const toggleFeeling = (feeling: string) => {
    const newValue = value.includes(feeling) ? value.filter((f) => f !== feeling) : [...value, feeling];
    onChange(newValue);
  };

  return (
    <Group gap="xs" wrap="wrap">
      {feelings.map((feeling) => {
        const isSelected = value.includes(feeling);
        return (
          <Button
            key={feeling}
            variant={isSelected ? 'filled' : 'subtle'}
            color={isSelected ? 'brand-charcoal' : 'gray'}
            onClick={() => toggleFeeling(feeling)}
            styles={(theme) => ({
              root: {
                backgroundColor: isSelected ? theme.colors['brand-charcoal'][8] : theme.colors['brand-beige'][1],
                color: isSelected ? theme.white : theme.black,
                '&:hover': {
                   backgroundColor: isSelected ? theme.colors['brand-charcoal'][7] : theme.colors['brand-beige'][2],
                }
              }
            })}
          >
            {feeling}
          </Button>
        );
      })}
    </Group>
  );
}