// src/components/JournalEditor.tsx
'use client';

import { Textarea } from '@mantine/core';
import { IconMicrophone } from '@tabler/icons-react';

interface JournalEditorProps {
  value: string;
  onChange: (content: string) => void;
}

export function JournalEditor({ value, onChange }: JournalEditorProps) {
  return (
    <Textarea
      placeholder="I felt neutral because..."
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