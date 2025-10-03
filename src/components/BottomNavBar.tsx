// src/components/BottomNavBar.tsx
"use client";

import { Anchor, Box, Group, Text } from "@mantine/core";
import {
	IconHome,
	IconBook,
	IconRun,
	IconChartLine,
	IconUserCircle,
} from "@tabler/icons-react";
import { usePathname } from "next/navigation";
import classes from "./BottomNavBar.module.css";

const navItems = [
	{ icon: IconHome, label: "Home", href: "/" },
	{ icon: IconBook, label: "Learn", href: "/learn" },
	{ icon: IconRun, label: "Exercises", href: "/exercises" },
	{ icon: IconChartLine, label: "Progress", href: "/progress" },
	{ icon: IconUserCircle, label: "Settings", href: "/settings" },
];

export function BottomNavBar() {
	const pathname = usePathname();
	return (
		<Group
			justify="space-around"
			wrap="nowrap"
			gap={0}
			style={(theme) => ({
				position: "absolute",
				bottom: 0,
				left: 0,
				right: 0,
				height: "80px",
				backgroundColor: theme.colors["brand-beige"][0],
				borderTop: `1px solid ${theme.colors["brand-beige"][2]}`,
				padding: `0 ${theme.spacing.xs}`,
			})}
		>
			<Box
				style={() => ({
					maxWidth: "720px",
					height: "100%",
					display: "flex",
					flexDirection: "row",
					flex: 1,
				})}
			>
				{navItems.map((item) => {
					const isActive = pathname === item.href;
					const Icon = item.icon;
					return (
						<Anchor
							key={item.label}
							href={item.href}
							className={classes.link}
							data-active={isActive ? "true" : undefined}
						>
							<Icon size={24} stroke={isActive ? 2 : 1.5} />
							<Text size="xs" mt={4}>
								{item.label}
							</Text>
						</Anchor>
					);
				})}
			</Box>
		</Group>
	);
}
