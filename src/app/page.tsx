// src/app/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Container, Title, Text, Paper, Stack, Box, Button, Group, Anchor } from '@mantine/core';
import { notifications } from '@mantine/notifications'; // We'll need to install this
import { MoodSelector } from '@/components/MoodSelector';
import { JournalEditor } from '@/components/JournalEditor';
import { SpecificFeelingsSelector } from '@/components/SpecificFeelingsSelector';
import { AiInsightCard } from '@/components/AiInsightCard';
import { BottomNavBar } from '@/components/BottomNavBar';
import type { Session } from '@supabase/supabase-js';

export default function HomePage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);

  // 1. State for our form, managed by this parent component
  const [mood, setMood] = useState<string | null>(null);
  const [feelings, setFeelings] = useState<string[]>([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  // Check for active session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. Function to handle saving the data to Supabase
  const handleSaveEntry = async () => {
    if (!mood && feelings.length === 0 && !content.trim()) {
      notifications.show({
        title: 'Empty Entry',
        message: 'Please select a mood or write something before saving.',
        color: 'yellow',
      });
      return;
    }

    setLoading(true);
    const { error } = await supabase.from('journal_entries').insert({
      mood,
      feelings,
      content,
      // user_id is automatically set by the database based on the logged-in user
    });

    if (error) {
      notifications.show({
        title: 'Error saving entry',
        message: error.message,
        color: 'red',
      });
    } else {
      notifications.show({
        title: 'Entry Saved!',
        message: 'Your mood and thoughts have been recorded.',
        color: 'green',
      });
      // Reset the form
      setMood(null);
      setFeelings([]);
      setContent('');
    }
    setLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.refresh();
  };

  // If user is not logged in, show a welcome/login message
  if (!session) {
    return (
      <Box style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
        <Container size="sm" py="xl">
          <Paper withBorder shadow="sm" p="lg" radius="md" ta="center">
            <Title order={2}>Welcome to your CBT Companion</Title>
            <Text mt="md" mb="xl">Please sign in to begin tracking your mood and thoughts.</Text>
            <Button component="a" href="/auth" size="md">
              Sign In or Sign Up
            </Button>
          </Paper>
        </Container>
      </Box>
    );
  }

  // Main app view for logged-in users
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
          <Group justify="space-between">
            <Box>
              <Title order={2} fw={700}>Mood & CBT Companion</Title>
              <Text size="sm" c="dimmed">Daily Check-in</Text>
            </Box>
            <Button variant="light" onClick={handleSignOut}>Sign Out</Button>
          </Group>

          <Title order={3} ta="left" fw={700}>
            How are you feeling today?
          </Title>

          <Paper shadow="sm" p="md" radius="md">
            {/* 3. Pass state and handlers down to child components */}
            <MoodSelector value={mood} onChange={setMood} />
          </Paper>

          <Paper shadow="sm" p="md" radius="md">
            <Title order={4} mb="sm" fw={600}>Add more specific feelings?</Title>
            <SpecificFeelingsSelector value={feelings} onChange={setFeelings} />
          </Paper>

          <Paper shadow="sm" p="md" radius="md">
            <Title order={4} mb="xs" fw={600}>
              What's on your mind?
            </Title>
            <JournalEditor
              value={content}
              onChange={setContent}
              onSave={handleSaveEntry}
              loading={loading}
            />
          </Paper>

          <AiInsightCard />
        </Stack>
      </Container>
      <BottomNavBar />
    </Box>
  );
}