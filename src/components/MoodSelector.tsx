// src/components/MoodSelector.tsx
'use client';

import { UnstyledButton, Group } from '@mantine/core';
import { moods } from '@/data/moods';

const darkenColor = (hexColor: string, percent: number): string => {
  let hex = hexColor.startsWith('#') ? hexColor.slice(1) : hexColor;
  if (hex.length === 3) hex = hex.split('').map(char => char + char).join('');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const amount = Math.floor(255 * (percent / 100));
  const newR = Math.max(0, r - amount).toString(16).padStart(2, '0');
  const newG = Math.max(0, g - amount).toString(16).padStart(2, '0');
  const newB = Math.max(0, b - amount).toString(16).padStart(2, '0');
  return `#${newR}${newG}${newB}`;
};

const lightenColor = (hexColor: string, percent: number): string => {
  let hex = hexColor.startsWith('#') ? hexColor.slice(1) : hexColor;
  if (hex.length === 3) hex = hex.split('').map(char => char + char).join('');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const amount = Math.floor(255 * (percent / 100));
  const newR = Math.min(255, r + amount).toString(16).padStart(2, '0');
  const newG = Math.min(255, g + amount).toString(16).padStart(2, '0');
  const newB = Math.min(255, b + amount).toString(16).padStart(2, '0');
  return `#${newR}${newG}${newB}`;
};

interface MoodSelectorProps {
  value: string | null;
  onChange: (mood: string | null) => void;
}

export function MoodSelector({ value, onChange }: MoodSelectorProps) {
  return (
    <Group justify="space-around" grow>
      {moods.map((mood) => {
        const Icon = mood.icon;
        const isSelected = value === mood.value;

        const darkShadow = darkenColor(mood.color, 10);
        const lightShadow = lightenColor(mood.color, 10);

        const embossShadow = `
          inset 3px 3px 7px ${darkShadow},
          inset -3px -3px 7px ${lightShadow}
        `;

        return (
          <UnstyledButton
            key={mood.value}
            onClick={() => onChange(mood.value)}
            style={() => ({
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '60px',
              width: '60px',
              borderRadius: '50%',
              backgroundColor: mood.color,
              boxShadow: isSelected ? embossShadow : 'none',
              transition: 'all 0.2s ease',
              transform: isSelected ? 'scale(0.95)' : 'scale(1)',
            })}
          >
            <Icon
              size={40}
              stroke={1}
              color={darkenColor(mood.color, 50)}
              style={{
                transition: 'transform 0.2s ease',
                transform: isSelected ? 'translateY(1px)' : 'translateY(0)',
              }}
            />
          </UnstyledButton>
        );
      })}
    </Group>
  );
}