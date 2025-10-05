// src/app/page.tsx
"use client";

import "regenerator-runtime/runtime";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useAiPrompts } from "@/hooks/useAiPrompts";
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

type JournalEntry = {
	content: string;
	date: string;
};

export default function HomePage() {
	const router = useRouter();
	const [session, setSession] = useState<Session | null>(null);
	const [mood, setMood] = useState<string | null>(null);
	const [feelings, setFeelings] = useState<string[]>([]);
	const [content, setContent] = useState("");
	const [loading, setLoading] = useState(false);

	const [entries, setEntries] = useState<JournalEntry[]>([]);
	const {
		prompts,
		isLoading: isAiLoading,
		error: aiError,
		generatePrompts,
	} = useAiPrompts();

	const {
		transcript,
		listening,
		resetTranscript,
		browserSupportsSpeechRecognition,
	} = useSpeechRecognition();

	useEffect(() => {
		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((_event, session) => {
			if (!session) {
				router.push("/auth");
			} else {
				setSession(session);
			}
		});
		return () => subscription.unsubscribe();
	}, [router]);

	const fetchEntries = useCallback(async () => {
		// No need to check for session here, as this is only called inside a session check
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
	}, []); // Removed session from dependency array as it's not directly used

	useEffect(() => {
		// This effect runs once when the component mounts and finds a session.
		// It fetches data and generates prompts in the background upon page load.
		supabase.auth.getSession().then(({ data: { session } }) => {
			if (session) {
				setSession(session);
				const loadInitialData = async () => {
					const loadedEntries = await fetchEntries();
					if (loadedEntries.length > 0) {
						generatePrompts(loadedEntries, 14);
					}
				};
				loadInitialData();
			} else {
				router.push("/auth");
			}
		});
	}, [router, fetchEntries, generatePrompts]);

	useEffect(() => {
		setFeelings([]);
	}, [mood]);

	useEffect(() => {
		setContent(transcript);
	}, [transcript]);

	const handleSaveEntry = async () => {
		if (!session) return;
		if (!mood && feelings.length === 0 && !content.trim()) {
			notifications.show({
				message:
					"Please select a mood or write something before saving.",
				color: "yellow",
			});
			return;
		}

		setLoading(true);
		const { error } = await supabase
			.from("journal_entries")
			.insert({ mood, feelings, content });

		setLoading(false); // Stop loading indicator immediately after the DB operation

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
			// --- FIX: REDIRECT IMMEDIATELY ---
			// We no longer wait for AI generation here. The user is redirected instantly.
			// The next time they visit the homepage, the prompts will be freshly updated.
			router.push("/progress");
		}
	};

	if (!session) {
		return null; // Or a loading spinner while waiting for the session
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

	const displayName =
		(session.user?.user_metadata as any)?.name ||
		session.user?.email?.split("@")[0] ||
		"";

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
						<JournalEditor
							value={content}
							onChange={setContent}
							isListening={listening}
							onToggleListening={handleToggleListening}
						/>
					</Stack>
					<AiInsightCard
						prompts={prompts}
						isLoading={isAiLoading}
						error={aiError}
						onGenerate={(days) => generatePrompts(entries, days)}
					/>
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
