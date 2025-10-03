// src/app/layout.tsx (Corrected)
import type { Metadata } from 'next';
import { Nunito } from 'next/font/google';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import './globals.css';
import { Providers } from './providers';
import { MainAppShell } from '@/components/MainAppShell';

const nunito = Nunito({ subsets: ['latin'], weight: ['400', '600', '700', '800'] });

export const metadata: Metadata = {
  title: 'CBT Companion',
  description: 'Your guide to understanding and reframing your thoughts.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={nunito.className}>
        <Providers>
          <MainAppShell>
            {children}
          </MainAppShell>
        </Providers>
      </body>
    </html>
  );
}