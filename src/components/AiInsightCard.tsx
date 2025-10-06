// src/components/AiInsightCard.tsx
"use client";

import { useState, useEffect } from "react";
import { Paper, Text, Loader, ActionIcon, Tooltip, Stack } from "@mantine/core";
import { IconRefresh, IconSparkles } from "@tabler/icons-react";

interface AiInsightCardProps {
	prompts: string[];
	isLoading: boolean;
	error: string | null;
    canRefresh: boolean;
    onGenerate: () => void; // Simplified onGenerate
}

export function AiInsightCard({ prompts, isLoading, error, canRefresh, onGenerate }: AiInsightCardProps) {
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
			return <Text size="sm" c="red">{error}</Text>;
		}
		if (prompts.length === 0) {
			return <Text size="sm" ta="center">Click the ✨ to generate your first AI insight.</Text>;
		}
		return <Text size="sm" ta="center">{prompts[currentIndex]}</Text>;
	};

	return (
		<Paper p="md" radius="md" /* ... styles */ >
			<Stack align="center" gap="sm">
				<div style={{ minHeight: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
					{renderContent()}
				</div>
				<ActionIcon.Group>
					<Tooltip label={canRefresh ? "Get a new insight" : "Refresh limit reached"} withArrow>
						<ActionIcon variant="light" onClick={onGenerate} disabled={!canRefresh} loading={isLoading}>
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