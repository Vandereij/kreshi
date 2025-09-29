// src/app/page.tsx (Corrected)

'use client';

import { Container, Title, Text, Paper, Stack, Box } from '@mantine/core';
import { MoodSelector } from '@/components/MoodSelector';
import { JournalEditor } from '@/components/JournalEditor';
import { SpecificFeelingsSelector } from '@/components/SpecificFeelingsSelector';
import { AiInsightCard } from '@/components/AiInsightCard';
import { BottomNavBar } from '@/components/BottomNavBar';

export default function HomePage() {
  return (
    // THE FIX IS HERE: 'sx' has been renamed to 'style'
    <Box
      style={(theme) => ({
        minHeight: '100vh',
        backgroundColor: theme.colors.gray[0],
        paddingBottom: '80px', // Increased padding to ensure no overlap with nav bar
      })}
    >
      <Container size="sm" py="xl"> {/* Changed size to 'sm' for a narrower, more mobile-like feel */}
        <Stack gap="lg"> {/* Changed gap to 'lg' for slightly tighter spacing */}
          {/* --- App Header (top left) --- */}
          <Box>
            <Title order={2} fw={700}>Mood & CBT Companion</Title>
            <Text size="sm" c="dimmed">Daily Check-in</Text>
          </Box>


          {/* --- Main Check-in Title --- */}
          <Title order={3} ta="left" fw={700}> {/* Changed order to 3 for better hierarchy */}
            How are you feeling today?
          </Title>

          {/* --- Mood Selection --- */}
          <Paper shadow="sm" p="md" radius="md">
            <MoodSelector />
          </Paper>

          {/* --- Specific Feelings Selection --- */}
          <Paper shadow="sm" p="md" radius="md">
            <Title order={4} mb="sm" fw={600}>Add more specific feelings?</Title> {/* Changed order to 4 */}
            <SpecificFeelingsSelector />
          </Paper>

          {/* --- Journaling Section --- */}
          <Paper shadow="sm" p="md" radius="md">
            <Title order={4} mb="xs" fw={600}> {/* Changed order to 4 */}
              What's on your mind?
            </Title>
            <JournalEditor />
          </Paper>

          {/* --- AI Insight Card --- */}
          <AiInsightCard />

        </Stack>
      </Container>

      {/* --- Fixed Bottom Navigation Bar --- */}
      <BottomNavBar />
    </Box>
  );
}