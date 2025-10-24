// src/components/AiInsightCard.tsx
"use client";

import { useState, useEffect } from "react";
import {
	Paper,
	Text,
	Loader,
	ActionIcon,
	Tooltip,
	Stack,
	Group,
} from "@mantine/core";
import { IconRefresh, IconSparkles } from "@tabler/icons-react";

interface AiInsightCardProps {
	prompts: string[];
	isLoading: boolean;
	error: string | null;
	canRefresh: boolean;
	onGenerate: () => void;
	usedCountToday: number; 
	dailyLimit: number; 
}

export function AiInsightCard({
	prompts,
	isLoading,
	error,
	canRefresh,
	onGenerate,
	usedCountToday,
	dailyLimit,
}: AiInsightCardProps) {
	const [currentIndex, setCurrentIndex] = useState(0);

	// When prompts are added or cleared, show the latest one
	useEffect(() => {
		setCurrentIndex(prompts.length - 1);
	}, [prompts]);

	const handleCycle = () => {
		if (prompts.length === 0) return;
		setCurrentIndex((prev) => (prev + 1) % prompts.length);
	};

	const renderContent = () => {
		if (isLoading && prompts.length === 0) {
			return <Loader size="sm" />;
		}
		if (error) {
			return (
				<Text size="sm" c="red">
					{error}
				</Text>
			);
		}
		if (prompts.length === 0) {
			return (
				<Text size="sm" ta="center">
					Click the ✨ to generate your first AI insight.
				</Text>
			);
		}
		return (
			<Text size="sm" ta="center">
				{prompts[currentIndex]}
			</Text>
		);
	};

	return (
		<Paper p="md" radius="md">
			<Stack align="center" gap="sm">
				{/* Credits row */}
				<Group justify="space-between" w="100%">
					<Text size="xs" c="dimmed">
						{usedCountToday} of {dailyLimit} used today
					</Text>
					{!canRefresh && (
						<Text size="xs" c="red">
							Daily limit reached
						</Text>
					)}
				</Group>

				<div
					style={{
						minHeight: "40px",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
					}}
				>
					{renderContent()}
				</div>

				<ActionIcon.Group>
					<Tooltip
						label={
							canRefresh
								? "Get a new insight"
								: "Refresh limit reached"
						}
						withArrow
					>
						<ActionIcon
							variant="light"
							onClick={onGenerate}
							disabled={!canRefresh}
							loading={isLoading}
						>
							<IconSparkles size="1rem" />
						</ActionIcon>
					</Tooltip>
					{prompts.length > 1 && (
						<Tooltip label="Cycle through saved insights" withArrow>
							<ActionIcon variant="light" onClick={handleCycle}>
								<IconRefresh size="1rem" />
							</ActionIcon>
						</Tooltip>
					)}
				</ActionIcon.Group>
			</Stack>
		</Paper>
	);
}
