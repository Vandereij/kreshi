// src/app/progress/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import {
	Container,
	Title,
	Text,
	Stack,
	Box,
	Loader,
	Paper
} from "@mantine/core";
import { BottomNavBar } from "@/components/BottomNavBar";
import { RecentEntriesList } from "@/components/RecentEntriesList";
import { MoodHeatmapCalendar } from "@/components/MoodHeatmapCalendar";

// Define a TypeScript type for our journal entries for type safety
export interface JournalEntry {
	id: string;
	created_at: string;
	mood: string | null;
	content: string | null;
	feelings: string[] | null;
}

export default function ProgressPage() {
	const [allEntries, setAllEntries] = useState<JournalEntry[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

	useEffect(() => {
		const fetchEntries = async () => {
			setLoading(true);
			const { data, error } = await createClient()
				.from("journal_entries")
				.select("*")
				.order("created_at", { ascending: false }); // Fetch newest first

			if (error) {
				setError(error.message);
			} else {
				setAllEntries(data as JournalEntry[]);
			}
			setLoading(false);
		};

		fetchEntries();
	}, []);

	const entriesForSelectedDay = useMemo(() => {
		if (!selectedDate) return [];
		return allEntries.filter((entry) => {
			const entryDate = new Date(entry.created_at);
			return entryDate.toDateString() === selectedDate.toDateString();
		});
	}, [allEntries, selectedDate]);

	const handleDayClick = (date: Date | null) => {
		// If the new date is null, just set the state to null
		if (!date) {
			setSelectedDate(null);
			return;
		}

		// This logic remains the same
		if (
			selectedDate &&
			date.toDateString() === selectedDate.toDateString()
		) {
			setSelectedDate(null);
		} else {
			setSelectedDate(date);
		}
	};

	if (loading) {
		return (
			<Box
				style={{
					display: "flex",
					justifyContent: "center",
					alignItems: "center",
					height: "100vh",
				}}
			>
				<Loader />
			</Box>
		);
	}

	if (error) {
		return (
			<Container size="sm" py="xl">
				<Paper withBorder shadow="sm" p="lg" radius="md">
					<Title order={3} c="red">
						Error
					</Title>
					<Text>Could not fetch your progress data: {error}</Text>
				</Paper>
			</Container>
		);
	}

	return (
		<Box style={{ paddingBottom: "80px" }}>
			<Container size="sm" py="xl">
				<Stack gap="lg">
					{/* Header Section */}
					<Box>
						<Title order={2} fw={800}>
							Your Progress
						</Title>
						<Text c="dimmed">
							Review your journey and find patterns.
						</Text>
					</Box>

					{allEntries.length === 0 && !loading ? (
						<Paper ta="center">
							<Title order={4}>No entries yet!</Title>
							<Text mt="sm">
								Your calendar will appear here once you make a
								check-in.
							</Text>
						</Paper>
					) : (
						<>
							{/* ---- THIS IS THE FIX ---- */}
							{/* Pass the selectedDate state down to the calendar component */}
							<MoodHeatmapCalendar
								entries={allEntries}
								onDayClick={handleDayClick}
								selectedDate={selectedDate}
							/>

							{/* Conditionally show the list for the selected day */}
							{selectedDate &&
								entriesForSelectedDay.length > 0 && (
									<RecentEntriesList
										entries={entriesForSelectedDay}
									/>
								)}

							{selectedDate &&
								entriesForSelectedDay.length === 0 && (
									<Paper ta="center">
										<Text c="dimmed">
											No entries found for this day.
										</Text>
									</Paper>
								)}
						</>
					)}
				</Stack>
			</Container>
			<BottomNavBar />
		</Box>
	);
}
