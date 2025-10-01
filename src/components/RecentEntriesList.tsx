// src/components/RecentEntriesList.tsx
'use client';

import { Paper, Title, Text, Accordion, Group, Badge } from '@mantine/core';
import type { JournalEntry } from '@/app/progress/page'; // We'll create this type next

interface RecentEntriesListProps {
  entries: JournalEntry[];
}

// A helper to format the date nicely
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

export function RecentEntriesList({ entries }: RecentEntriesListProps) {
  return (
    <Paper withBorder shadow="sm" p="md" radius="md">
      <Title order={4} fw={600} mb="lg">Recent Entries</Title>
      <Accordion variant="separated">
        {entries.map((entry) => (
          <Accordion.Item key={entry.id} value={entry.id}>
            <Accordion.Control>
              <Group justify="space-between">
                <Text fw={500}>{formatDate(entry.created_at)}</Text>
                {entry.mood && <Badge color="blue" variant="light">{entry.mood}</Badge>}
              </Group>
            </Accordion.Control>
            <Accordion.Panel>
              {entry.content ? (
                <Text>{entry.content}</Text>
              ) : (
                <Text c="dimmed" fs="italic">No journal text for this entry.</Text>
              )}
              {entry.feelings && entry.feelings.length > 0 && (
                <Group gap="xs" mt="sm">
                  {entry.feelings.map(feeling => <Badge key={feeling} color="gray">{feeling}</Badge>)}
                </Group>
              )}
            </Accordion.Panel>
          </Accordion.Item>
        ))}
      </Accordion>
    </Paper>
  );
}