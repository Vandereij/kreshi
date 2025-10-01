// src/app/auth/page.tsx
"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import {
	Container,
	Title,
	Text,
	Paper,
	TextInput,
	PasswordInput,
	Button,
	Stack,
	Tabs,
	Alert,
	Box,
} from "@mantine/core";
import { IconAlertCircle, IconCheck } from "@tabler/icons-react";

export default function AuthPage() {
	const router = useRouter();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [activeTab, setActiveTab] = useState<string | null>("signin");

	// Clear form state when switching tabs
	const handleTabChange = (value: string | null) => {
		setEmail("");
		setPassword("");
		setError(null);
		setSuccessMessage(null); // Clear success message too
		setActiveTab(value);
	};

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (activeTab === "signin") {
			await handleSignIn();
		} else {
			await handleSignUp();
		}
	};

	const handleSignUp = async () => {
		setLoading(true);
		setError(null);
		setSuccessMessage(null);
		const { error } = await supabase.auth.signUp({
			email,
			password,
		});

		if (error) {
			setError(error.message);
		} else {
			setSuccessMessage(
				"Sign up successful! Please check your email to confirm your account."
			);
		}
		setLoading(false);
	};

	const handleSignIn = async () => {
		setLoading(true);
		setError(null);
		setSuccessMessage(null);
		const { error } = await supabase.auth.signInWithPassword({
			email,
			password,
		});

		if (error) {
			setError(error.message);
		} else {
			router.push("/");
			router.refresh();
		}
		setLoading(false);
	};

	// --- New function for Magic Link ---
	const handleMagicLinkSignIn = async () => {
		setLoading(true);
		setError(null);
		setSuccessMessage(null);

		const redirectURL =
			process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000/";

		const { error } = await supabase.auth.signInWithOtp({
			email,
			options: {
				// This is the URL the user will be redirected to after clicking the magic link.
				// It must be an absolute URL.
				emailRedirectTo: redirectURL,
			},
		});

		if (error) {
			setError(error.message);
		} else {
			setSuccessMessage(
				"Check your email for the magic link to sign in!"
			);
		}
		setLoading(false);
	};

	return (
		// The main "phone screen" is now in layout.tsx, so we just need a container.
		<Container size="sm" py="xl">
			<Stack gap="lg">
				{/* Header Section */}
				<Box>
					<Title order={2} fw={800}>
						Mood & CBT Companion
					</Title>
					<Text c="dimmed">
						Sign in or create an account to continue
					</Text>
				</Box>

				{/* Auth Form in a Paper component */}
				<Paper>
					{" "}
					{/* It will now use the default styles from our theme */}
					<Tabs defaultValue="signin" onChange={handleTabChange}>
						<Tabs.List grow>
							<Tabs.Tab value="signin">Sign In</Tabs.Tab>
							<Tabs.Tab value="signup">Sign Up</Tabs.Tab>
							<Tabs.Tab value="magiclink">Magic Link</Tabs.Tab>
						</Tabs.List>

						<form onSubmit={handleSubmit}>
							<Tabs.Panel value="signin" pt="lg">
								<Stack>
									<TextInput
										label="Email"
										placeholder="you@youremail.com"
										value={email}
										onChange={(e) =>
											setEmail(e.currentTarget.value)
										}
										required
										type="email"
									/>
									<PasswordInput
										label="Password"
										placeholder="Your password"
										value={password}
										onChange={(e) =>
											setPassword(e.currentTarget.value)
										}
										required
									/>
									<Button
										type="submit"
										loading={loading}
										fullWidth
										mt="md"
									>
										Sign In
									</Button>
								</Stack>
							</Tabs.Panel>

							<Tabs.Panel value="signup" pt="lg">
								<Stack>
									<TextInput
										label="Email"
										placeholder="you@youremail.com"
										value={email}
										onChange={(e) =>
											setEmail(e.currentTarget.value)
										}
										required
										type="email"
									/>
									<PasswordInput
										label="Password"
										placeholder="Your password"
										value={password}
										onChange={(e) =>
											setPassword(e.currentTarget.value)
										}
										required
									/>
									<Button
										type="submit"
										loading={loading}
										fullWidth
										mt="md"
									>
										Sign Up
									</Button>
								</Stack>
							</Tabs.Panel>
						</form>

						{/* 2. Add the Magic Link Panel */}
						<Tabs.Panel value="magiclink" pt="lg">
							<Stack>
								<TextInput
									label="Email"
									placeholder="you@youremail.com"
									value={email}
									onChange={(e) =>
										setEmail(e.currentTarget.value)
									}
									required
									type="email"
								/>
								<Button
									onClick={handleMagicLinkSignIn}
									loading={loading}
									fullWidth
									mt="md"
								>
									Send Magic Link
								</Button>
							</Stack>
						</Tabs.Panel>
					</Tabs>
				</Paper>

				{/* Success and Error Alerts */}
				{successMessage && (
					<Alert
						icon={<IconCheck size="1rem" />}
						title="Success"
						color="teal"
						radius="md"
					>
						{successMessage}
					</Alert>
				)}
				{error && (
					<Alert
						icon={<IconAlertCircle size="1rem" />}
						title="Error"
						color="red"
						radius="md"
					>
						{error}
					</Alert>
				)}
			</Stack>
		</Container>
	);
}
