// src/components/EditEntryForm.tsx
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
	Loader,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { MoodSelector } from "@/components/MoodSelector";
import { JournalEditor } from "@/components/JournalEditor";
import { SpecificFeelingsSelector } from "@/components/SpecificFeelingsSelector";
import { moods } from "@/data/moods";
import { feelingsByMood } from "@/data/feelings";
import type { Session } from "@supabase/supabase-js";
import SpeechRecognition, {
	useSpeechRecognition,
} from "react-speech-recognition";

interface EditEntryFormProps {
	id: string;
}

export function EditEntryForm({ id }: EditEntryFormProps) {
	const router = useRouter();
	const [session, setSession] = useState<Session | null>(null);
	const [mood, setMood] = useState<string | null>(null);
	const [feelings, setFeelings] = useState<string[]>([]);
	const [content, setContent] = useState("");
	const [loading, setLoading] = useState(false);
	const [isFetching, setIsFetching] = useState(true);

	const {
		transcript,
		listening,
		resetTranscript,
		browserSupportsSpeechRecognition,
	} = useSpeechRecognition();

	// The fetchEntry function now uses the 'id' prop directly
	const fetchEntry = useCallback(async () => {
		const { data, error } = await supabase
			.from("journal_entries")
			.select("*")
			.eq("id", id)
			.single();

		if (error) {
			console.error("Error fetching entry:", error);
			notifications.show({
				title: "Error",
				message: "Could not fetch the journal entry.",
				color: "red",
			});
			router.push("/progress"); // Redirect if entry not found
		} else if (data) {
			setMood(data.mood);
			setFeelings(data.feelings || []);
			setContent(data.content || "");
		}
		setIsFetching(false);
	}, [id, router]);

	useEffect(() => {
		const fetchSession = async () => {
			const {
				data: { session },
			} = await supabase.auth.getSession();

			if (session) {
				setSession(session);
				fetchEntry();
			} else {
				router.push("/auth");
			}
		};

		fetchSession();
	}, [router, fetchEntry]);

	useEffect(() => {
		setContent(transcript);
	}, [transcript]);

	// The update function also uses the 'id' prop
	const handleUpdateEntry = async () => {
		if (!session) return;
		if (!mood) {
			notifications.show({
				message: "A mood is required to save your entry.",
				color: "yellow",
			});
			return;
		}

		setLoading(true);
		const { error } = await supabase
			.from("journal_entries")
			.update({ mood, feelings, content })
			.eq("id", id);

		setLoading(false);

		if (error) {
			notifications.show({
				title: "Error",
				message: error.message,
				color: "red",
			});
		} else {
			notifications.show({
				title: "Updated!",
				message: "Your entry has been successfully updated.",
				color: "teal",
			});
			router.push("/progress");
		}
	};

	if (!session || isFetching) {
		return (
			<Container
				size="sm"
				py="xl"
				style={{
					display: "flex",
					justifyContent: "center",
					alignItems: "center",
					height: "100vh",
				}}
			>
				<Loader />
			</Container>
		);
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
			<Container size="sm" py="xl">
				<Stack gap="xl">
					<Box>
						<Title order={2} fw={800}>
							Edit Journal Entry
						</Title>
						<Text c="dimmed">
							Make any changes you need and save your updated
							reflection.
						</Text>
					</Box>
					<Stack gap="md">
						<Title order={3} fw={700}>
							How were you feeling?
						</Title>
						<MoodSelector value={mood} onChange={setMood} />
						<Collapse in={!!selectedMoodObject}>
							<Title order={4} fw={700} pb={16} pt={16}>
								Update specific feelings?
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
						<JournalEditor
							value={content}
							onChange={setContent}
							isListening={listening}
							onToggleListening={handleToggleListening}
						/>
					</Stack>
				</Stack>
				<Box
					style={(theme) => ({
						padding: `calc(${theme.spacing.sm} * 3) 0`,
					})}
				>
					<Button
						fullWidth
						size="lg"
						onClick={handleUpdateEntry}
						loading={loading}
					>
						Update Entry
					</Button>
				</Box>
			</Container>
		</Box>
	);
}