// src/components/AiInsightCard.tsx
"use client";

import { useState, useEffect } from "react";
import {
	Paper,
	Text,
	Loader,
	// Group,
	ActionIcon,
	Tooltip,
	Stack,
	// Button,
} from "@mantine/core";
import { IconRefresh } from "@tabler/icons-react";

interface AiInsightCardProps {
	prompts: string[];
	isLoading: boolean;
	error: string | null;
	onGenerate: (days: number) => void;
}

export function AiInsightCard({
	prompts,
	isLoading,
	error,
	// onGenerate,
}: AiInsightCardProps) {
	const [currentIndex, setCurrentIndex] = useState(0);

	// --- CHANGE: Create a new array limited to a maximum of 3 prompts ---
	const displayPrompts = prompts.slice(0, 3);

	// Reset the index when the original prompts prop changes
	useEffect(() => {
		setCurrentIndex(0);
	}, [prompts]);

	const handleNextPrompt = () => {
		// --- CHANGE: Use the limited array for cycling ---
		setCurrentIndex((prevIndex) => (prevIndex + 1) % displayPrompts.length);
	};

	const renderContent = () => {
		if (isLoading) {
			return <Loader size="sm" />;
		}

		if (error) {
			return (
				<Text size="sm" c="red">
					Failed to load insights. Please try again.
				</Text>
			);
		}

		// --- CHANGE: Check the limited array ---
		if (!displayPrompts || displayPrompts.length === 0) {
			return (
				<Text size="sm" ta="center">
					Write a few more entries to unlock your first AI-powered
					insight!
				</Text>
			);
		}

		// --- CHANGE: Display from the limited array ---
		return (
			<Text size="sm" ta="center">
				{displayPrompts[currentIndex]}
			</Text>
		);
	};

	return (
		<Paper
			p="md"
			radius="md"
			style={(theme) => ({
				backgroundColor: theme.colors["brand-beige"][1],
				border: "none",
			})}
		>
			<Stack align="center" gap="sm">
				<div
					style={{
						minHeight: "40px",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						gap: "8px"
					}}
				>
					{renderContent()}

					{displayPrompts.length > 1 && (
						<Tooltip label="Next Prompt" withArrow>
							<ActionIcon
								variant="subtle"
								onClick={handleNextPrompt}
								size="sm"
							>
								<IconRefresh />
							</ActionIcon>
						</Tooltip>
					)}
				</div>

				{/* <Group justify="center" gap="xs"> */}
				{/* --- CHANGE: Check the limited array's length --- */}
				{/* {displayPrompts.length > 1 && (
						<Tooltip label="Next Prompt" withArrow>
							<ActionIcon variant="subtle" onClick={handleNextPrompt} size="sm">
								<IconRefresh />
							</ActionIcon>
						</Tooltip>
					)}
                    <Button 
                        variant="light" 
                        size="compact-xs" 
                        onClick={() => onGenerate(7)} 
                        disabled={isLoading}
                    >
                        Last 7 Days
                    </Button>
                     <Button 
                        variant="light" 
                        size="compact-xs" 
                        onClick={() => onGenerate(30)} 
                        disabled={isLoading}
                    >
                        Last 30 Days
                    </Button>
				</Group> */}
			</Stack>
		</Paper>
	);
}
