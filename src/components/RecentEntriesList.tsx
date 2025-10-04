// src/components/RecentEntriesList.tsx
"use client";

import { useState, useEffect } from "react"; // Import useState and useEffect
import { Paper, Title, Text, Accordion, Group, Badge, Skeleton } from "@mantine/core";
import type { JournalEntry } from "@/app/progress/page";

export function RecentEntriesList({ entries }: { entries: JournalEntry[] }) {
	// --- THE FIX: PART 1 ---
	// Create a state to track if the component has mounted on the client
	const [hasMounted, setHasMounted] = useState(false);
	useEffect(() => {
		setHasMounted(true);
	}, []);

	return (
		<Paper>
			<Title order={4} fw={700} mb="lg">
				Recent Entries
			</Title>
			<Accordion variant="separated" radius="md">
				{entries.map((entry) => (
					<Accordion.Item key={entry.id} value={entry.id}>
						<Accordion.Control>
							<Text fw={600} component="div">
								{/* --- THE FIX: PART 2 --- */}
								{/* Conditionally render the date */}
								{/* On the server (and initial client render), show a placeholder */}
								{!hasMounted ? (
									<Skeleton height={16} width="50%" />
								) : (
									// After mounting, show the correctly formatted date for the user's locale
									new Date(entry.created_at).toLocaleString(
										"en-US",
										{
											month: "long",
											day: "numeric",
											hour: "numeric",
											minute: "numeric",
											hour12: true,
										}
									)
								)}
							</Text>
						</Accordion.Control>
						<Accordion.Panel>
							{entry.mood && (
								<Badge color="gray" variant="light" mb="sm">
									{entry.mood}
								</Badge>
							)}
							{entry.content ? (
								<Text>{entry.content}</Text>
							) : (
								<Text c="dimmed" fs="italic">
									No journal text.
								</Text>
							)}
							{entry.feelings && entry.feelings.length > 0 && (
								<Group gap="xs" mt="sm">
									{entry.feelings.map((feeling) => (
										<Badge key={feeling} color="gray">
											{feeling}
										</Badge>
									))}
								</Group>
							)}
						</Accordion.Panel>
					</Accordion.Item>
				))}
			</Accordion>
		</Paper>
	);
}