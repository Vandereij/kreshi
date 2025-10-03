// src/components/MainAppShell.tsx
'use client';

import { Box } from '@mantine/core';

export function MainAppShell({ children }: { children: React.ReactNode }) {
  return (
    <Box
      style={(theme) => ({
        // maxWidth: '420px',
        minHeight: '100vh',
        margin: '0 auto',
        backgroundColor: theme.colors['brand-beige'][0],
        boxShadow: theme.shadows.lg,
        position: 'relative',
        // borderRadius: '24px',
        overflow: 'hidden',
      })}
    >
      {children}
    </Box>
  );
}