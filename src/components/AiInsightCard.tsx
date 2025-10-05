"use client";

import { useState, useEffect } from "react";
import { Paper, Text, Loader, Group, ActionIcon, Tooltip, Stack, Button } from "@mantine/core";
import { IconRefresh } from "@tabler/icons-react"; // Make sure to install @tabler/icons-react

// Define the props the component will accept
interface AiInsightCardProps {
	prompts: string[];
	isLoading: boolean;
	error: string | null;
    onGenerate: (days: number) => void; // Function to call when user clicks a button
}

export function AiInsightCard({ prompts, isLoading, error, onGenerate }: AiInsightCardProps) {
	const [currentIndex, setCurrentIndex] = useState(0);

	// When the prompts array changes (e.g., after a new fetch), reset the index to 0
	useEffect(() => {
		setCurrentIndex(0);
	}, [prompts]);

	const handleNextPrompt = () => {
		// Cycle through the available prompts
		setCurrentIndex((prevIndex) => (prevIndex + 1) % prompts.length);
	};

	const renderContent = () => {
		if (isLoading) {
			return <Loader size="sm" />;
		}

		if (error) {
			return <Text size="sm" c="red">Failed to load insights. Please try again.</Text>;
		}

		if (!prompts || prompts.length === 0) {
			return (
				<Text size="sm" ta="center">
					Write a few more entries to unlock your first AI-powered insight!
				</Text>
			);
		}

		// Display the current prompt
		return <Text size="sm" ta="center">{prompts[currentIndex]}</Text>;
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
                {/* Main content area for prompts, loaders, or errors */}
				<div style={{ minHeight: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
					{renderContent()}
				</div>

                {/* Action buttons */}
				<Group justify="center" gap="xs">
                    {/* Show refresh button only if there are multiple prompts */}
					{prompts.length > 1 && (
						<Tooltip label="Next Prompt" withArrow>
							<ActionIcon variant="subtle" onClick={handleNextPrompt} size="sm">
								<IconRefresh />
							</ActionIcon>
						</Tooltip>
					)}
                    {/* Buttons to generate prompts for different time ranges */}
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
				</Group>
			</Stack>
		</Paper>
	);
}