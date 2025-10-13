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
	Modal,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useRouter } from "next/navigation";
import type { JournalEntry } from "@/app/progress/page";

interface RecentEntriesListProps {
    entries: JournalEntry[];
    onEntryDeleted: (id: string) => void;
}

export function RecentEntriesList({
	entries,
    onEntryDeleted
}: RecentEntriesListProps) {
	const router = useRouter();
	const [hasMounted, setHasMounted] = useState(false);
	const [opened, { open, close }] = useDisclosure(false);
	const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
	const [isDeleting, setIsDeleting] = useState(false); // State to handle loading

	useEffect(() => {
		setHasMounted(true);
	}, []);

	const openDeleteModal = (id: string) => {
		setSelectedEntryId(id);
		open();
	};

	const handleDeleteEntry = async () => {
		if (selectedEntryId) {
			setIsDeleting(true); // Start loading
			try {
				const response = await fetch(`/api/entries/${selectedEntryId}`, {
					method: "DELETE",
				});

				if (!response.ok) {
					// Handle error from the API
					throw new Error("Failed to delete the entry.");
				}
				
                onEntryDeleted(selectedEntryId);
				close();
			} catch (error) {
				console.error("Failed to delete the entry:", error);
				// Optionally, show a notification to the user that deletion failed
			} finally {
				setIsDeleting(false); // Stop loading regardless of outcome
			}
		}
	};

	return (
		<>
			<Modal
				opened={opened}
				onClose={close}
				title="Delete Journal Entry"
			>
				<Text>
					Are you sure you want to delete this entry? This action is
					irreversible.
				</Text>
				<Group justify="flex-end" mt="md">
					<Button variant="default" onClick={close} disabled={isDeleting}>
						Cancel
					</Button>
					<Button
						color="red"
						onClick={handleDeleteEntry}
						loading={isDeleting} // Show loading spinner
					>
						Delete
					</Button>
				</Group>
			</Modal>

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
										new Date(
											entry.created_at
										).toLocaleString("en-US", {
											month: "long",
											day: "numeric",
											hour: "numeric",
											minute: "numeric",
											hour12: true,
										})
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
									<Group gap="xs">
										<Button
											variant="light"
											size="xs"
											onClick={() =>
												router.push(
													`/edit/${entry.id}`
												)
											}
										>
											Edit
										</Button>
										<Button
											variant="light"
											color="red"
											size="xs"
											onClick={() =>
												openDeleteModal(entry.id)
											}
										>
											Delete
										</Button>
									</Group>
								</Group>

								{entry.content ? (
									<Text>{entry.content}</Text>
								) : (
									<Text c="dimmed" fs="italic">
										No journal text.
									</Text>
								)}
								{entry.feelings &&
									entry.feelings.length > 0 && (
										<Group gap="xs" mt="sm">
											{entry.feelings.map((feeling) => (
												<Badge
													key={feeling}
													color="gray"
												>
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
		</>
	);
}