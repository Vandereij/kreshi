// src/app/providers.tsx (Corrected)
'use client';

// 1. Import MantineTheme alongside the other imports
import { MantineProvider, createTheme, MantineTheme } from '@mantine/core';
import { Notifications } from '@mantine/notifications';

const theme = createTheme({
  fontFamily: 'Nunito, sans-serif',
  headings: { fontFamily: 'Nunito, sans-serif' },

  colors: {
    'brand-beige': [
      '#F9F5F0', '#F3ECE4', '#EEDDD8', '#E8CFCC', '#E2C1BF',
      '#DBB3B3', '#D5A5A6', '#CFA79A', '#C8998D', '#C28B81'
    ],
    'brand-charcoal': [
      '#E8E8E8', '#D1D1D1', '#BABABA', '#A3A3A3', '#8C8C8C',
      '#757575', '#5E5E5E', '#474747', '#303030', '#1C1C1C'
    ],
  },
  
  primaryColor: 'brand-charcoal',
  white: '#FFFFFF',
  black: '#1C1C1C',

  components: {
    Paper: {
      defaultProps: {
        bg: 'white',
        shadow: 'sm',
        p: 'md',
        radius: 'md',
        withBorder: true,
      },
      // 2. Add the MantineTheme type to the 'theme' parameter
      styles: (theme: MantineTheme) => ({
        root: {
          borderColor: theme.colors['brand-beige'][2],
        },
      }),
    },
    Button: {
      defaultProps: {
        radius: 'xl',
      },
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MantineProvider theme={theme} defaultColorScheme="light">
      <Notifications position="top-right" />
      {children}
    </MantineProvider>
  );
}