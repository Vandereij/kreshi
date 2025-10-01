// src/components/MoodChart.tsx
'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Paper, Title, Text } from '@mantine/core';

// Define the structure of the data our chart expects
interface ChartData {
  date: string;
  mood: number;
}

interface MoodChartProps {
  data: ChartData[];
}

export function MoodChart({ data }: MoodChartProps) {
  return (
    <Paper withBorder shadow="sm" p="md" radius="md">
      <Title order={4} fw={600} mb="xs">Mood Over Time</Title>
      <Text size="sm" c="dimmed" mb="lg">
        Track how your mood has changed based on your daily check-ins.
      </Text>
      {/* ResponsiveContainer makes the chart fill its parent container */}
      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={data}
          margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis dataKey="date" stroke="#888" fontSize={12} />
          <YAxis
            stroke="#888"
            fontSize={12}
            domain={[1, 5]} // Mood scale from 1 (Awful) to 5 (Great)
            ticks={[1, 2, 3, 4, 5]}
            tickFormatter={(value) => ['Awful', 'Bad', 'Okay', 'Good', 'Great'][value - 1]}
          />
          <Tooltip
            formatter={(value: number) => {
              const label = ['Awful', 'Bad', 'Okay', 'Good', 'Great'][value - 1];
              return [value, label];
            }}
          />
          <Line
            type="monotone"
            dataKey="mood"
            stroke="#1971c2" // Mantine's default blue color
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 8 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </Paper>
  );
}