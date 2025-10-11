// src/components/RecentEntriesList.tsx
"use client";

import { useState, useEffect } from "react";
import {
	Paper,
	Title,
	Text,
	Accordion,
	Group,
	Badge,
	Skeleton,
	Button,
} from "@mantine/core";
import { useRouter } from "next/navigation";
import type { JournalEntry } from "@/app/progress/page";

export function RecentEntriesList({ entries }: { entries: JournalEntry[] }) {
	const router = useRouter();
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
								{!hasMounted ? (
									<Skeleton height={16} width="50%" />
								) : (
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
							<Group justify="space-between" mb="sm">
								{entry.mood && (
									<Badge color="gray" variant="light">
										{entry.mood}
									</Badge>
								)}
								<Button
									variant="light"
									size="xs"
									onClick={() =>
										router.push(`/edit/${entry.id}`)
									}
								>
									Edit
								</Button>
							</Group>

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