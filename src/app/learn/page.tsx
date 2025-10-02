"use client";

import { Container, Title, Text, Stack, Card, Badge, Group, Button, Alert, Box } from "@mantine/core";
import { IconAlertCircle, IconExternalLink } from "@tabler/icons-react";
import { resourcesByCategory, LearningResource } from "@/data/learningResources";
import { BottomNavBar } from "@/components/BottomNavBar";

function ResourceCard({ resource }: { resource: LearningResource }) {
	return (
		<Card withBorder radius="md" p="md">
			<Stack gap="xs">
				<Group justify="space-between">
					<Text fw={600}>{resource.title}</Text>
					<Badge variant="light">{resource.type}</Badge>
				</Group>
				<Text size="sm" c="dimmed">
					{resource.description}
				</Text>
				<Group justify="space-between" mt="md">
					<Text size="xs" c="dimmed">
						Source: {resource.source}
					</Text>
					<Button
						component="a"
						href={resource.url}
						target="_blank"
						rel="noopener noreferrer"
						variant="outline"
						size="xs"
						rightSection={<IconExternalLink size={14} />}
					>
						View Resource
					</Button>
				</Group>
			</Stack>
		</Card>
	);
}

export default function LearningPage() {
	const categories = Object.keys(resourcesByCategory);

	return (
		<>
			{/* 
			  The fix is here: We're increasing the padding at the bottom.
			  Using the `pb` prop is a cleaner way to apply padding from the theme.
			  A value of 120px should be plenty of space.
			*/}
			<Container size="sm" py="xl" pb={120}>
				<Stack gap="xl">
					<Box>
						<Title order={2} fw={800}>
							Learning Hub
						</Title>
						<Text c="dimmed">
							CBT and self-help resources to support your journey.
						</Text>
					</Box>

					<Alert
						variant="light"
						color="yellow"
						title="Disclaimer"
						icon={<IconAlertCircle />}
					>
						This information is for educational purposes and is not a substitute for professional medical advice, diagnosis, or treatment.
					</Alert>

					{categories.map((category) => (
						<Stack key={category} gap="md">
							<Title order={3} fw={700}>
								{category}
							</Title>
							{resourcesByCategory[category as keyof typeof resourcesByCategory].map((resource) => (
								<ResourceCard
									key={resource.url}
									resource={resource}
								/>
							))}
						</Stack>
					))}
				</Stack>
			</Container>
			<BottomNavBar />
		</>
	);
}