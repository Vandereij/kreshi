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
	TextInput,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { BottomNavBar } from "@/components/BottomNavBar";
import type { User } from "@supabase/supabase-js";

export default function SettingsPage() {
	const router = useRouter();
	const [user, setUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(false);

	// State for Profile Details
	const [username, setUsername] = useState("");
	const [firstName, setFirstName] = useState("");
	const [lastName, setLastName] = useState("");
	const [phoneNumber, setPhoneNumber] = useState("");

	// State for Password Change
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");

	// Fetch user and profile data on component mount
	useEffect(() => {
		const fetchData = async () => {
			setLoading(true);
			// Fetches the current logged-in user's data
			const {
				data: { user },
			} = await supabase.auth.getUser();
			setUser(user);

			if (user) {
				// Fetch the corresponding profile from the 'profiles' table
				const { data: profile, error } = await supabase
					.from("profiles")
					.select("username, first_name, last_name, phone_number")
					.eq("id", user.id)
					.single();

				if (error) {
					console.warn(error);
				} else if (profile) {
					setUsername(profile.username || "");
					setFirstName(profile.first_name || "");
					setLastName(profile.last_name || "");
					setPhoneNumber(profile.phone_number || "");
				}
			}
			setLoading(false);
		};
		fetchData();
	}, []);

	// Function to update the user's profile details
	const handleProfileUpdate = async () => {
		if (!user) return;

		setLoading(true);
		const { error } = await supabase.from("profiles").upsert({
			id: user.id, // The user's ID
			username,
			first_name: firstName,
			last_name: lastName,
			phone_number: phoneNumber,
			updated_at: new Date().toISOString(),
		});

		if (error) {
			if (error.code === "23505") {
				// Code for unique violation in PostgreSQL
				notifications.show({
					title: "Username Taken",
					message:
						"That username is already in use. Please choose another one.",
					color: "red",
				});
			} else {
				notifications.show({
					title: "Error",
					message: error.message,
					color: "red",
				});
			}
		} else {
			notifications.show({
				title: "Success!",
				message: "Your profile has been updated.",
				color: "green",
			});
		}
		setLoading(false);
	};

	const handlePasswordUpdate = async () => {
		if (newPassword.length < 8) {
			notifications.show({
				title: "Password Too Short",
				message:
					"Please enter a password that is at least 8 characters long.",
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

					{/* Profile Details Section */}
					<Paper withBorder shadow="sm" p="lg" radius="md">
						<Title order={4} fw={700}>
							Profile Details
						</Title>
						<Text size="sm" c="dimmed" mt="xs">
							Your email address is permanent.
						</Text>
						<Stack mt="md">
							<TextInput
								label="Email"
								value={user ? user.email : ""}
								disabled
							/>
							<TextInput
								label="Username"
								placeholder="Your public display name"
								value={username}
								onChange={(e) =>
									setUsername(e.currentTarget.value)
								}
							/>
							<Group grow>
								<TextInput
									label="First Name"
									placeholder="e.g., Jane"
									value={firstName}
									onChange={(e) =>
										setFirstName(e.currentTarget.value)
									}
								/>
								<TextInput
									label="Last Name"
									placeholder="e.g., Doe"
									value={lastName}
									onChange={(e) =>
										setLastName(e.currentTarget.value)
									}
								/>
							</Group>
							<TextInput
								label="Phone Number"
								placeholder="Your phone number"
								value={phoneNumber}
								onChange={(e) =>
									setPhoneNumber(e.currentTarget.value)
								}
							/>
							<Button
								onClick={handleProfileUpdate}
								loading={loading}
								mt="sm"
							>
								Save Profile
							</Button>
						</Stack>
					</Paper>

					{/* Change Password Section */}
					<Paper withBorder shadow="sm" p="lg" radius="md">
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
					<Paper withBorder shadow="sm" p="lg" radius="md">
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
