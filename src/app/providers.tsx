// src/app/providers.tsx
'use client';

import { MantineProvider, createTheme } from '@mantine/core';

// Define a custom theme
const theme = createTheme({
  // Use the font from layout.tsx
  fontFamily: 'Nunito, sans-serif',
  headings: { fontFamily: 'Nunito, sans-serif' },
  // Softer primary color
  primaryColor: 'teal', // Or try 'indigo', 'blue' with specific shades
  colors: {
    // Customizing the default 'teal' palette for a softer look if needed
    // 'teal': ['#e3fdf5', '#d2f9eb', '#c2f6e1', '#b1f3d8', '#a1f0ce', '#91edc4', '#80eac0', '#70e7b6', '#60e4ac', '#50e1a2'],
  },
  // Softer rounded corners everywhere
  radius: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
  },
  shadows: {
    // Custom shadows for cards
    sm: '0 1px 3px rgba(0,0,0,.05), 0 1px 2px rgba(0,0,0,.05)',
    md: '0 4px 6px rgba(0,0,0,.08), 0 1px 3px rgba(0,0,0,.06)',
    lg: '0 10px 15px rgba(0,0,0,.1), 0 4px 6px rgba(0,0,0,.05)',
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MantineProvider
      theme={theme}
      // The color scheme is now set here, on the provider itself
      defaultColorScheme="light"
    >
      {children}
    </MantineProvider>
  );
}