// src/components/RecentEntriesList.tsx
"use client";

import { Paper, Title, Text, Accordion, Group, Badge } from "@mantine/core";
import type { JournalEntry } from "@/app/progress/page"; // We'll create this type next

// A helper to format the date nicely
const formatDate = (dateString: string) => {
	return new Date(dateString).toLocaleDateString("en-US", {
		month: "long",
		day: "numeric",
		hour: "numeric",
		minute: "numeric",
		hour12: true,
	});
};

export function RecentEntriesList({ entries }: { entries: JournalEntry[] }) {
	return (
		<Paper>
			{" "}
			{/* Uses default styles */}
			<Title order={4} fw={700} mb="lg">
				Recent Entries
			</Title>
			<Accordion variant="separated" radius="md">
				{entries.map((entry) => (
					<Accordion.Item key={entry.id} value={entry.id}>
						<Accordion.Control>
							<Text fw={600}>{formatDate(entry.created_at)}</Text>
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
