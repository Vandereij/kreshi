// src/app/settings/page.tsx
"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import {
	Container,
	Title,
	Text,
	Stack,
	Box,
	Paper,
	PasswordInput,
	Button,
	Group,
	Divider,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { BottomNavBar } from "@/components/BottomNavBar";
import type { User } from "@supabase/supabase-js";

export default function SettingsPage() {
	const router = useRouter();
	const [user, setUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(false);
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");

	useEffect(() => {
		const fetchUser = async () => {
			// Fetches the current logged-in user's data
			const {
				data: { user },
			} = await supabase.auth.getUser();
			setUser(user);
		};
		fetchUser();
	}, []);

	const handlePasswordUpdate = async () => {
		if (newPassword.length < 6) {
			notifications.show({
				title: "Password Too Short",
				message:
					"Please enter a password that is at least 6 characters long.",
				color: "yellow",
			});
			return;
		}

		if (newPassword !== confirmPassword) {
			notifications.show({
				title: "Passwords Do Not Match",
				message: "Please ensure both password fields are identical.",
				color: "red",
			});
			return;
		}

		setLoading(true);
		const { error } = await supabase.auth.updateUser({
			password: newPassword,
		});

		if (error) {
			notifications.show({
				title: "Error",
				message: error.message,
				color: "red",
			});
		} else {
			notifications.show({
				title: "Success!",
				message: "Your password has been updated successfully.",
				color: "green",
			});
			setNewPassword("");
			setConfirmPassword("");
		}
		setLoading(false);
	};

	const handleSignOut = async () => {
		setLoading(true);
		await supabase.auth.signOut();
		router.push("/auth"); // Redirect to the login page after sign out
	};

	return (
		<Box style={{ paddingBottom: "80px" }}>
			<Container size="sm" py="xl">
				<Stack gap="lg">
					{/* Header Section */}
					<Box>
						<Title order={2} fw={800}>
							Settings
						</Title>
						<Text c="dimmed">
							Manage your account details and preferences.
						</Text>
					</Box>

					{/* Account Information Section */}
					<Paper>
						{" "}
						{/* Uses default styles */}
						<Title order={4} fw={700}>
							Account Information
						</Title>
						<Group justify="space-between" mt="md">
							<Text size="sm" c="dimmed">
								Email
							</Text>
							<Text size="sm" fw={500}>
								{user ? user.email : "Loading..."}
							</Text>
						</Group>
					</Paper>

					{/* Change Password Section */}
					<Paper>
						<Title order={4} fw={700}>
							Change Password
						</Title>
						<Stack mt="md">
							<PasswordInput
								label="New Password"
								placeholder="Enter new password"
								value={newPassword}
								onChange={(e) =>
									setNewPassword(e.currentTarget.value)
								}
							/>
							<PasswordInput
								label="Confirm New Password"
								placeholder="Confirm new password"
								value={confirmPassword}
								onChange={(e) =>
									setConfirmPassword(e.currentTarget.value)
								}
							/>
							<Button
								onClick={handlePasswordUpdate}
								loading={loading}
								disabled={!newPassword || !confirmPassword}
								mt="sm"
							>
								Update Password
							</Button>
						</Stack>
					</Paper>

					{/* Danger Zone Section */}
					<Paper>
						<Title order={4} fw={700} c="red.8">
							Danger Zone
						</Title>
						<Divider my="sm" />
						<Group justify="space-between">
							<Text size="sm">
								Permanently sign out of your account.
							</Text>
							<Button
								variant="light"
								color="red"
								onClick={handleSignOut}
								loading={loading}
							>
								Sign Out
							</Button>
						</Group>
					</Paper>
				</Stack>
			</Container>
			<BottomNavBar />
		</Box>
	);
}
