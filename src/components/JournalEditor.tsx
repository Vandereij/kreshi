// src/components/JournalEditor.tsx
'use client';

import { Textarea, Button, Group } from '@mantine/core';
import { IconMicrophone } from '@tabler/icons-react';

// 1. Define props
interface JournalEditorProps {
  value: string;
  onChange: (content: string) => void;
  onSave: () => void;
  loading: boolean;
}

export function JournalEditor({ value, onChange, onSave, loading }: JournalEditorProps) {
  return (
    <>
      <Textarea
        placeholder="I felt this way because..."
        autosize
        minRows={4}
        // 2. Use props for value and onChange
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
        rightSection={
          <IconMicrophone size={20} style={{ display: 'block', opacity: 0.7, cursor: 'pointer' }} />
        }
      />
      <Group justify="flex-end" mt="md">
        {/* 3. Use the onSave prop for the button's onClick handler */}
        <Button onClick={onSave} loading={loading}>
          Save Entry
        </Button>
      </Group>
    </>
  );
}