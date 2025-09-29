// src/components/BottomNavBar.tsx (Corrected)
'use client';

import { Anchor, Group, Text } from '@mantine/core';
import { IconHome, IconBook, IconRun, IconChartLine } from '@tabler/icons-react';
import { usePathname } from 'next/navigation';

const navItems = [
  { icon: IconHome, label: 'Home', href: '/' },
  { icon: IconBook, label: 'Learn', href: '/learn' },
  { icon: IconRun, label: 'Exercises', href: '/exercises' },
  { icon: IconChartLine, label: 'Progress', href: '/progress' },
];

export function BottomNavBar() {
  const pathname = usePathname();

  return (
    <Group
      justify="space-between"
      wrap="nowrap"
      style={(theme) => ({
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '60px',
        backgroundColor: theme.white,
        borderTop: `1px solid ${theme.colors.gray[2]}`,
        padding: `0 ${theme.spacing.md}`,
        zIndex: 1000,
        boxShadow: theme.shadows.sm,
        // THE FIX IS HERE: Replaced theme.fn.smallerThan with a standard media query
        [`@media (maxWidth: ${theme.breakpoints.sm})`]: {
          padding: `0 ${theme.spacing.xs}`,
        },
      })}
    >
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;

        return (
          <Anchor
            key={item.label}
            href={item.href}
            variant="text"
            style={(theme) => ({
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textDecoration: 'none',
              color: isActive ? theme.colors.blue[6] : theme.colors.gray[6],
              fontWeight: isActive ? 600 : 400,
              '&:hover': {
                color: theme.colors.blue[5],
              },
              transform: isActive ? 'scale(1.05)' : 'scale(1)',
              transition: 'all 0.1s ease',
            })}
          >
            <Icon size={24} stroke={1.5} />
            <Text size="xs" mt={4}>{item.label}</Text>
          </Anchor>
        );
      })}
    </Group>
  );
}