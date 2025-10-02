// src/components/AppHeader.tsx
"use client";

import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import {
	Box,
	Group,
	Title,
	Text,
	Menu,
	ActionIcon,
	Divider,
} from "@mantine/core";
import { IconUserCircle, IconSettings, IconLogout } from "@tabler/icons-react";

// Define the props the component will accept
interface AppHeaderProps {
	title: string;
	description: string;
}

export function AppHeader({ title, description }: AppHeaderProps) {
	const router = useRouter();

	const handleSignOut = async () => {
		await supabase.auth.signOut();
		router.push("/auth");
	};

	return (
		<Group justify="space-between">
			<Box>
				<Title order={2} fw={700}>
					{title}
				</Title>
				<Text size="sm" c="dimmed">
					{description}
				</Text>
			</Box>

			{/* User Menu Dropdown */}
			<Menu shadow="md" width={200}>
				<Menu.Target>
					<ActionIcon
						variant="light"
						size="lg"
						radius="xl"
						aria-label="User Menu"
					>
						<IconUserCircle size="1.5rem" />
					</ActionIcon>
				</Menu.Target>

				<Menu.Dropdown>
					<Menu.Label>Account</Menu.Label>
					<Menu.Item
						leftSection={<IconSettings size={14} />}
						component="a"
						href="/settings"
					>
						Settings
					</Menu.Item>

					<Divider />

					<Menu.Item
						color="red"
						leftSection={<IconLogout size={14} />}
						onClick={handleSignOut}
					>
						Sign Out
					</Menu.Item>
				</Menu.Dropdown>
			</Menu>
		</Group>
	);
}
