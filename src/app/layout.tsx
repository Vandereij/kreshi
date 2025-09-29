// src/app/layout.tsx

import type { Metadata } from 'next';
// Import Nunito font
import { Nunito } from 'next/font/google';

// Mantine styles
import '@mantine/core/styles.css';
import './globals.css';
import { Providers } from './providers';

// Configure Nunito font
const nunito = Nunito({ subsets: ['latin'], weight: ['400', '600', '700'] });

export const metadata: Metadata = {
  title: 'CBT Companion',
  description: 'Your guide to understanding and reframing your thoughts.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      {/* Apply Nunito class to body */}
      <body className={nunito.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}