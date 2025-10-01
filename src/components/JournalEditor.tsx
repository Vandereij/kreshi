// src/components/JournalEditor.tsx
'use client';

import { Textarea } from '@mantine/core';
import { IconMicrophone } from '@tabler/icons-react';

interface JournalEditorProps {
  value: string;
  onChange: (content: string) => void;
  moodLabel?: string; 
}

export function JournalEditor({ value, onChange, moodLabel }: JournalEditorProps) {
  const placeholderText = moodLabel
    ? `I feel ${moodLabel.toLowerCase()} because...`
    : 'Describe your thoughts and feelings...';

  return (
    <Textarea
      // 3. Apply the dynamic placeholder
      placeholder={placeholderText}
      autosize
      minRows={4}
      variant="filled"
      radius="md"
      value={value}
      onChange={(event) => onChange(event.currentTarget.value)}
      rightSection={<IconMicrophone size={20} style={{ display: 'block', opacity: 0.5 }}/>}
      styles={(theme) => ({
        input: {
          backgroundColor: theme.colors['brand-beige'][1],
        }
      })}
    />
  );
}