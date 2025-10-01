// src/app/progress/page.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Container, Title, Text, Stack, Box, Loader, Paper } from '@mantine/core';
import { BottomNavBar } from '@/components/BottomNavBar';
import { MoodChart } from '@/components/MoodChart';
import { RecentEntriesList } from '@/components/RecentEntriesList';
import { AppHeader } from '@/components/AppHeader';

// Define a TypeScript type for our journal entries for type safety
export interface JournalEntry {
  id: string;
  created_at: string;
  mood: string | null;
  content: string | null;
  feelings: string[] | null;
}

// A mapping from mood string to a numerical value for the chart
const moodToValue: { [key: string]: number } = {
  awful: 1,
  bad: 2,
  okay: 3,
  good: 4,
  great: 5,
};

export default function ProgressPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEntries = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('journal_entries')
        .select('*')
        .order('created_at', { ascending: false }); // Fetch newest first

      if (error) {
        setError(error.message);
      } else {
        setEntries(data as JournalEntry[]);
      }
      setLoading(false);
    };

    fetchEntries();
  }, []);

  // useMemo will only re-calculate the chart data when the `entries` array changes
  const chartData = useMemo(() => {
    // Reverse the entries for the chart so time flows from left to right
    return entries
      .slice()
      .reverse()
      .filter(entry => entry.mood && moodToValue[entry.mood])
      .map(entry => ({
        date: new Date(entry.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        mood: moodToValue[entry.mood!],
      }));
  }, [entries]);

  if (loading) {
    return (
      <Box style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Loader />
      </Box>
    );
  }

  if (error) {
    return (
      <Container size="sm" py="xl">
        <Paper withBorder shadow="sm" p="lg" radius="md">
          <Title order={3} c="red">Error</Title>
          <Text>Could not fetch your progress data: {error}</Text>
        </Paper>
      </Container>
    );
  }

  return (
    <Box
      style={(theme) => ({
        minHeight: '100vh',
        backgroundColor: theme.colors.gray[0],
        paddingBottom: '80px',
      })}
    >
      <Container size="sm" py="xl">
        <Stack gap="lg">
          <AppHeader
            title="Your Progress"
            description="Review your journey and find your patterns"
          />

          {entries.length === 0 ? (
            <Paper withBorder shadow="sm" p="lg" radius="md" ta="center">
              <Title order={4}>No entries yet!</Title>
              <Text mt="sm">Start by making your first daily check-in on the Home page.</Text>
            </Paper>
          ) : (
            <>
              <MoodChart data={chartData} />
              <RecentEntriesList entries={entries} />
            </>
          )}

        </Stack>
      </Container>
      <BottomNavBar />
    </Box>
  );
}