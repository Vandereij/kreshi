"use client";

import { Container, Title, Text, Stack, Card, Badge, Group, Button, Alert, Box } from "@mantine/core";
import { IconAlertCircle, IconExternalLink } from "@tabler/icons-react";
import { exercisesByCategory, ExerciseResource } from "@/data/exerciseResources";
import { BottomNavBar } from "@/components/BottomNavBar";

// A reusable card component for displaying an exercise
function ExerciseCard({ resource }: { resource: ExerciseResource }) {
	return (
		<Card withBorder radius="md" p="md">
			<Stack gap="xs">
				<Group justify="space-between">
					<Text fw={600}>{resource.title}</Text>
					<Badge color="teal" variant="light">{resource.type}</Badge>
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
						variant="filled" // A filled button might feel more "actionable" here
						size="xs"
						rightSection={<IconExternalLink size={14} />}
					>
						Start Exercise
					</Button>
				</Group>
			</Stack>
		</Card>
	);
}

export default function ExercisesPage() {
	const categories = Object.keys(exercisesByCategory);

	return (
		<>
			<Container size="sm" py="xl" pb={120}> {/* Padding bottom to avoid nav overlap */}
				<Stack gap="xl">
					{/* Header */}
					<Box>
						<Title order={2} fw={800}>
							Exercises & Tools
						</Title>
						<Text c="dimmed">
							Practice CBT skills with these guided exercises.
						</Text>
					</Box>

					{/* Disclaimer */}
					<Alert
						variant="light"
						color="yellow"
						title="For Educational Use"
						icon={<IconAlertCircle />}
					>
						These tools are for practice and self-help. They are not a substitute for professional medical advice or therapy.
					</Alert>

					{/* Categories and Exercises */}
					{categories.map((category) => (
						<Stack key={category} gap="md">
							<Title order={3} fw={700}>
								{category}
							</Title>
							{exercisesByCategory[category as keyof typeof exercisesByCategory].map((resource) => (
								<ExerciseCard
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