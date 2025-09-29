// src/components/JournalEditor.tsx

'use client';

import { Textarea, Button, Group } from '@mantine/core';
import { IconMicrophone } from '@tabler/icons-react'; // Needs installation

export function JournalEditor() {
  return (
    <>
      <Textarea
        placeholder="I felt neutral because..." // Updated placeholder
        label="Your journal entry" // Label changed to 'Your journal entry' if needed, or removed if the title handles it
        // description="The more detail, the better the AI can help." // Removed as per image
        autosize
        minRows={4}
        rightSection={
          <IconMicrophone size={20} style={{ display: 'block', opacity: 0.7, cursor: 'pointer' }} />
        }
        rightSectionPointerEvents="all" // Make the icon clickable
      />
      {/* Save Entry button could be moved or removed based on the final UX */}
      {/* <Group justify="flex-end" mt="md">
        <Button>Save Entry</Button>
      </Group> */}
    </>
  );
}