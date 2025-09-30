// src/components/SpecificFeelingsSelector.tsx
'use client';

import { Button, Group } from '@mantine/core';

const feelings = [
  'Anxious', 'Stressed', 'Happy', 'Grateful', 'Tired', 'Hopeful', 'Irritated'
];

// 1. Define props
interface SpecificFeelingsSelectorProps {
  value: string[];
  onChange: (feelings: string[]) => void;
}

export function SpecificFeelingsSelector({ value, onChange }: SpecificFeelingsSelectorProps) {
  // 2. Remove useState. State is controlled by the parent.

  const toggleFeeling = (feeling: string) => {
    // 3. Create the new array and pass it to the onChange prop
    const newValue = value.includes(feeling)
      ? value.filter((f) => f !== feeling)
      : [...value, feeling];
    onChange(newValue);
  };

  return (
    <Group gap="xs" wrap="wrap">
      {feelings.map((feeling) => (
        <Button
          key={feeling}
          // 4. Check against the `value` prop
          variant={value.includes(feeling) ? 'filled' : 'light'}
          color={value.includes(feeling) ? 'blue' : 'gray'}
          radius="xl"
          onClick={() => toggleFeeling(feeling)}
          size="sm"
        >
          {feeling}
        </Button>
      ))}
    </Group>
  );
}