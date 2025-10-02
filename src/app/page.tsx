// src/app/page.tsx
"use client";

import "regenerator-runtime/runtime";
import { useState, useEffect } from "react";
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

export default function HomePage() {
	const router = useRouter();
	const [session, setSession] = useState<Session | null>(null);
	const [mood, setMood] = useState<string | null>(null);
	const [feelings, setFeelings] = useState<string[]>([]);
	const [content, setContent] = useState("");
	const [loading, setLoading] = useState(false);

	const {
		transcript,
		listening,
		resetTranscript,
		browserSupportsSpeechRecognition,
	} = useSpeechRecognition();

	useEffect(() => {
		supabase.auth.getSession().then(({ data: { session } }) => {
			if (!session) {
				router.push("/auth"); // Redirect if not logged in
			} else {
				setSession(session);
			}
		});
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

	useEffect(() => {
		// This prevents keeping "Happy" selected if the user switches from "Great" to "Awful".
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
			setMood(null);
			setFeelings([]);
			setContent("");
			resetTranscript();
		}
		setLoading(false);
	};

	if (!session) {
		return null; // Or a loading spinner
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

	return (
		<Box style={{ paddingBottom: "90px" }}>
			{" "}
			{/* Space for bottom nav + save button */}
			<Container size="sm" py="xl">
				<Stack gap="xl">
					{/* Header Section */}
					<Box>
						<Title order={2} fw={800}>
							Mood & CBT Companion
						</Title>
						<Text c="dimmed">Daily Check-in</Text>
					</Box>

					{/* How are you feeling? Section */}
					<Stack gap="md">
						{" "}
						{/* Use a slightly smaller gap for this internal block */}
						<Title order={3} fw={700}>
							How are you feeling today?
						</Title>
						<MoodSelector value={mood} onChange={setMood} />
						<Text ta="center" size="md" fw={600}>
							{selectedMoodObject?.label}
						</Text>
						<Collapse in={!!selectedMoodObject}>
							<Title order={4} fw={700}>
								Add more specific feelings?
							</Title>
							<SpecificFeelingsSelector
								availableFeelings={availableFeelings}
								value={feelings}
								onChange={setFeelings}
							/>
						</Collapse>
					</Stack>

					{/* Journal Section */}
					<Stack gap="xs">
						<Title order={4} fw={700}>
							What&apos;s on your mind?
						</Title>
						<Text size="sm" c="dimmed">
							Describe your day or what led to this feeling.
						</Text>
						<JournalEditor
							value={content}
							onChange={setContent}
							moodLabel={selectedMoodObject?.label} // Pass the label here
							isListening={listening}
							onToggleListening={handleToggleListening}
						/>
					</Stack>

					<AiInsightCard />
				</Stack>
			</Container>
			{/* Save Button outside container for full-width effect */}
			<Box
				style={(theme) => ({
					padding: `0 ${theme.spacing.sm} ${theme.spacing.sm}`,
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
			<BottomNavBar />
		</Box>
	);
}
