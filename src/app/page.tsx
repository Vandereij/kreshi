// src/app/page.tsx
"use client";

import "regenerator-runtime/runtime";
// ✅ THE FIX IS HERE: Added 'useMemo' to the import list.
import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { notifications } from "@mantine/notifications";
import type { Session } from "@supabase/supabase-js";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import { usePersistentPrompts } from "@/hooks/usePersistentPrompts";
import { motion } from "framer-motion";

import { MoodWaveSelector3D } from "@/components/MoodWaveSelector3d";
import { JournalEditor } from "@/components/JournalEditor";
import { SpecificFeelingsSelector } from "@/components/SpecificFeelingsSelector";
import { AiInsightCard } from "@/components/AiInsightCard";
import { BottomNavBar } from "@/components/BottomNavBar";
import { moods as predefinedMoods } from "@/data/moods";
import { feelingsByMood } from "@/data/feelings";

const Header = ({ displayName }: { displayName: string }) => (
	<div className="flex justify-between items-center px-4 py-4">
		<div className="w-8 h-8 rounded-full flex items-center justify-center"></div>
		<h1 className="text-dark-text text-lg font-semibold">Flow & Clarity</h1>
		<div className="w-8 h-8 rounded-full flex items-center justify-center"></div>
	</div>
);

type JournalEntry = {
	content: string;
	date: string;
};
type Profile = {
	username?: string;
	first_name?: string;
	display_name_preference?: string;
};

export default function HomePage() {
	const router = useRouter();
	const [session, setSession] = useState<Session | null>(null);
	const [profile, setProfile] = useState<Profile | null>(null);
	const [mood, setMood] = useState<string | null>('okay');
	const [feelings, setFeelings] = useState<string[]>([]);
	const [content, setContent] = useState("");
	const [loading, setLoading] = useState(false);

    const moodValues = useMemo(() => predefinedMoods.map(m => m.value), []);
    const moodLabels = useMemo(() => {
        return predefinedMoods.reduce((acc, mood) => {
            acc[mood.value] = mood.label;
            return acc;
        }, {} as { [key: string]: string });
    }, []);

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
		const { data, error } = await createClient()
			.from("journal_entries")
			.select("content, created_at")
			.order("created_at", { ascending: true });

		if (error) {
			console.error("Error fetching entries:", error);
			return;
		}

		const formattedEntries: JournalEntry[] = data.map((entry) => ({
			content: entry.content,
			date: new Date(entry.created_at).toISOString().slice(0, 10),
		}));

		setEntries(formattedEntries);
	}, []);

	useEffect(() => {
		const fetchSessionAndProfile = async () => {
			const {
				data: { session },
			} = await createClient().auth.getSession();

			if (session) {
				setSession(session);
				fetchEntries();

				const { data: profileData, error } = await createClient()
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
		if (!session || !mood) return;

		setLoading(true);
		const { error } = await createClient()
			.from("journal_entries")
			.insert({ mood, feelings, content });
		setLoading(false);

		if (error) {
			notifications.show({ title: "Error", message: error.message, color: "red" });
		} else {
			notifications.show({ title: "Saved!", message: "Your entry has been recorded.", color: "teal" });
			
			setMood('okay');
			setFeelings([]);
			setContent("");
			resetTranscript();
			fetchEntries();
		}
	};

	if (!session) return null;

	const availableFeelings = mood ? feelingsByMood[mood] : [];

	const handleToggleListening = () => {
		if (listening) {
			SpeechRecognition.stopListening();
		} else {
			resetTranscript();
			SpeechRecognition.startListening({ continuous: true });
		}
	};

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
		return (
			profile?.username ||
			profile?.first_name ||
			session.user?.email?.split("@")[0] ||
			""
		);
	};
	const displayName = getDisplayName();

	return (
		<div className="min-h-screen bg-primary-bg flex flex-col relative pb-28">
			<Header displayName={displayName} />

			<div className="flex-grow flex flex-col items-center p-4">
				<MoodWaveSelector3D
					moods={moodValues}
					moodLabels={moodLabels}
					value={mood}
					onChange={setMood}
				/>

				<motion.div
					key={mood}
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5 }}
					className="w-full max-w-sm mt-8 flex flex-col gap-4"
				>
					<h3 className="text-dark-text text-lg font-semibold text-center">
						Refine your feelings
					</h3>
					<SpecificFeelingsSelector
						availableFeelings={availableFeelings}
						value={feelings}
						onChange={setFeelings}
					/>
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
					<motion.button
						whileHover={{ scale: 1.02 }}
						whileTap={{ scale: 0.98 }}
						className="w-full bg-accent-teal text-white py-3 rounded-lg font-semibold mt-4 transition-colors duration-200 shadow-md hover:bg-opacity-90 disabled:bg-gray-400"
						onClick={handleSaveEntry}
						disabled={loading || !mood}
					>
						{loading ? "Saving..." : "Save Entry"}
					</motion.button>
				</motion.div>
			</div>

			<BottomNavBar />
		</div>
	);
}