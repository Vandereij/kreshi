// src/app/page.tsx
"use client";

import "regenerator-runtime/runtime";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import {
	Container,
	Title,
	Text,
	Stack,
	Box,
	Button,
	Collapse,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { MoodSelector } from "@/components/MoodSelector";
import { JournalEditor } from "@/components/JournalEditor";
import { SpecificFeelingsSelector } from "@/components/SpecificFeelingsSelector";
import { AiInsightCard } from "@/components/AiInsightCard";
import { BottomNavBar } from "@/components/BottomNavBar";
import { moods } from "@/data/moods";
import { feelingsByMood } from "@/data/feelings";
import type { Session } from "@supabase/supabase-js";
import SpeechRecognition, {
	useSpeechRecognition,
} from "react-speech-recognition";
import { usePersistentPrompts } from "@/hooks/usePersistentPrompts";

type JournalEntry = {
	content: string;
	date: string;
};

// --- UPDATE: The Profile type ---
type Profile = {
	username?: string;
	first_name?: string;
	display_name_preference?: string; // Add the new field
};

export default function HomePage() {
	const router = useRouter();
	const [session, setSession] = useState<Session | null>(null);
	const [profile, setProfile] = useState<Profile | null>(null);
	const [mood, setMood] = useState<string | null>(null);
	const [feelings, setFeelings] = useState<string[]>([]);
	const [content, setContent] = useState("");
	const [loading, setLoading] = useState(false);

	const [entries, setEntries] = useState<JournalEntry[]>([]);
	const {
		prompts,
		isLoading: isAiLoading,
		error: aiError,
		generateNewPrompt,
		canRefresh,
	} = usePersistentPrompts(entries);

	const {
		transcript,
		listening,
		resetTranscript,
		browserSupportsSpeechRecognition,
	} = useSpeechRecognition();

	const fetchEntries = useCallback(async () => {
		const { data, error } = await supabase
			.from("journal_entries")
			.select("content, created_at")
			.order("created_at", { ascending: true });

		if (error) {
			console.error("Error fetching entries:", error);
			return [];
		}

		const formattedEntries: JournalEntry[] = data.map((entry) => ({
			content: entry.content,
			date: new Date(entry.created_at).toISOString().slice(0, 10),
		}));

		setEntries(formattedEntries);
		return formattedEntries;
	}, []);

	useEffect(() => {
		const fetchSessionAndProfile = async () => {
			const {
				data: { session },
			} = await supabase.auth.getSession();

			if (session) {
				setSession(session);
				fetchEntries();

				// --- UPDATE: Fetch the new preference column ---
				const { data: profileData, error } = await supabase
					.from("profiles")
					.select("username, first_name, display_name_preference")
					.eq("id", session.user.id)
					.single();

				if (error) {
					console.error("Error fetching profile:", error.message);
				} else if (profileData) {
					setProfile(profileData);
				}
			} else {
				router.push("/auth");
			}
		};

		fetchSessionAndProfile();
	}, [router, fetchEntries]);

	useEffect(() => {
		setFeelings([]);
	}, [mood]);

	useEffect(() => {
		setContent(transcript);
	}, [transcript]);

	const handleSaveEntry = async () => {
		if (!session) return;
		if (!mood) {
			notifications.show({
				message: "Please select a mood before saving.",
				color: "yellow",
			});
			return;
		}

		setLoading(true);
		const { error } = await supabase
			.from("journal_entries")
			.insert({ mood, feelings, content });

		setLoading(false);

		if (error) {
			notifications.show({
				title: "Error",
				message: error.message,
				color: "red",
			});
		} else {
			notifications.show({
				title: "Saved!",
				message: "Your entry has been recorded.",
				color: "teal",
			});
			router.push("/progress");
		}
	};

	if (!session) {
		return null;
	}

	const selectedMoodObject = moods.find((m) => m.value === mood);
	const availableFeelings = mood ? feelingsByMood[mood] : [];

	if (!browserSupportsSpeechRecognition) {
		return (
			<Container size="sm" py="xl">
				<Text c="red">
					Your browser does not support speech recognition.
				</Text>
			</Container>
		);
	}

	const handleToggleListening = () => {
		if (listening) {
			SpeechRecognition.stopListening();
		} else {
			resetTranscript();
			SpeechRecognition.startListening({ continuous: true });
		}
	};

	// --- UPDATE: Logic for displaying the user's preferred name ---
	const getDisplayName = () => {
		if (!profile && session.user?.email) {
			return session.user.email.split("@")[0];
		}
		if (
			profile?.display_name_preference === "first_name" &&
			profile.first_name
		) {
			return profile.first_name;
		}
		// Fallback chain
		return (
			profile?.username ||
			profile?.first_name ||
			session.user?.email?.split("@")[0] ||
			""
		);
	};

	const displayName = getDisplayName();

	return (
		<Box style={{ paddingBottom: "90px" }}>
			<Container size="sm" py="xl">
				<Stack gap="xl">
					<Box>
						<Title order={2} fw={800}>
							Mood & CBT Companion
						</Title>
						<Text c="dimmed">
							{displayName
								? `Welcome back, ${displayName}. `
								: ""}
							Ready to check in?
						</Text>
					</Box>
					<Stack gap="md">
						<Title order={3} fw={700}>
							How are you feeling today?
						</Title>
						<MoodSelector value={mood} onChange={setMood} />
						<Text ta="center" size="md" fw={600}>
							{selectedMoodObject?.label}
						</Text>
						<Collapse in={!!selectedMoodObject}>
							<Title order={4} fw={700} pb={16}>
								Add more specific feelings?
							</Title>
							<SpecificFeelingsSelector
								availableFeelings={availableFeelings}
								value={feelings}
								onChange={setFeelings}
							/>
						</Collapse>
					</Stack>
					<Stack gap="xs">
						<Title order={3} fw={700}>
							Journal reflection
						</Title>
						<Text size="sm" c="dimmed">
							{selectedMoodObject?.label
								? `Tell me more about feeling ${selectedMoodObject?.label.toLowerCase()}...`
								: `What's on your mind?`}
						</Text>
						<AiInsightCard
							prompts={prompts}
							isLoading={isAiLoading}
							error={aiError}
							canRefresh={canRefresh}
							onGenerate={() => generateNewPrompt(entries)}
						/>
						<JournalEditor
							value={content}
							onChange={setContent}
							isListening={listening}
							onToggleListening={handleToggleListening}
						/>
					</Stack>
					<Text size="xs" c="dimmed">
						💡 Over time, your companion will highlight recurring
						themes and patterns to help you grow.
					</Text>
				</Stack>
				<Box
					style={(theme) => ({
						padding: `calc(${theme.spacing.sm} * 3) 0`,
					})}
				>
					<Button
						fullWidth
						size="lg"
						onClick={handleSaveEntry}
						loading={loading}
					>
						Save Entry
					</Button>
				</Box>
			</Container>
			<BottomNavBar />
		</Box>
	);
}