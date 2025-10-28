"use client";

import { DateTime } from "luxon";
import ReactMarkdown from "react-markdown";
import {
	Paper,
	Title,
	Text,
	Group,
	Badge,
	Skeleton,
	Button,
	Divider,
	Stack,
	Alert,
} from "@mantine/core";
import { IconCalendar, IconInfoCircle, IconRefresh } from "@tabler/icons-react";

export type WeeklySummaryRow = {
	id: string;
	user_id?: string;
	week_start: string | Date;
	week_end?: string | Date | null;
	timezone?: string | null;
	entry_count?: number | null;
	summary?: string | null;
	model?: string | null;
	updated_at?: string | Date | null;
	[key: string]: unknown;
};

interface WeeklySummaryCardProps {
	summary: WeeklySummaryRow | null;
	title?: string;
	showMeta?: boolean;
	onGenerate?: () => void | Promise<void>;
	onRefresh?: () => void | Promise<void>;
}

export default function WeeklySummaryCardClient({
	summary,
	title = "This Week",
	showMeta = true,
	onGenerate,
	onRefresh,
}: WeeklySummaryCardProps) {
	const formatted = getFormattedWeek(
		summary?.week_start ?? null,
		summary?.week_end ?? null,
		summary?.timezone ?? undefined
	);

	return (
		<Paper radius="md" p="lg" withBorder>
			<Group justify="space-between" align="center" mb="xs">
				<Group gap="sm" align="center">
					<IconCalendar size={18} />
					<Title order={4}>{title}</Title>
				</Group>
				<Group gap="xs">
					{onRefresh && (
						<Button
							variant="default"
							leftSection={<IconRefresh size={16} />}
							onClick={() => onRefresh()}
						>
							Refresh
						</Button>
					)}
					{onGenerate && (
						<Button onClick={() => onGenerate()}>
							Generate summary
						</Button>
					)}
				</Group>
			</Group>

			{formatted ? (
				<Group gap="xs" wrap="wrap" mb="md">
					<Badge variant="light" color="gray">
						{formatted.label}
					</Badge>
					<Badge variant="light" color="gray">
						{formatted.range}
					</Badge>
				</Group>
			) : (
				<Skeleton height={18} w={160} />
			)}

			<Divider mb="md" />

			{summary ? (
				<Stack gap="sm">
					{showMeta && (
						<Group gap="xs">
							{typeof summary.entry_count === "number" && (
								<Badge variant="light" color="gray">
									{summary.entry_count} entries
								</Badge>
							)}
						</Group>
					)}

					{summary.summary ? (
						<ReactMarkdown
							components={{
								p: ({ children }) => <Text mb="sm">{children}</Text>,
								strong: ({ children }) => <Text component="span" fw={600}>{children}</Text>,
								em: ({ children }) => <Text component="span" fs="italic">{children}</Text>,
								ul: ({ children }) => <Stack gap="xs" ml="md" mb="sm">{children}</Stack>,
								li: ({ children }) => <Text component="li">{children}</Text>,
								h1: ({ children }) => <Title order={2} mt="md" mb="xs">{children}</Title>,
								h2: ({ children }) => <Title order={3} mt="md" mb="xs">{children}</Title>,
								h3: ({ children }) => <Title order={4} mt="sm" mb="xs">{children}</Title>,
							}}
						>
							{summary.summary}
						</ReactMarkdown>
					) : summary.content ? (
						<ReactMarkdown
							components={{
								p: ({ children }) => <Text mb="sm">{children}</Text>,
								strong: ({ children }) => <Text component="span" fw={600}>{children}</Text>,
								em: ({ children }) => <Text component="span" fs="italic">{children}</Text>,
								ul: ({ children }) => <Stack gap="xs" ml="md" mb="sm">{children}</Stack>,
								li: ({ children }) => <Text component="li">{children}</Text>,
								h1: ({ children }) => <Title order={2} mt="md" mb="xs">{children}</Title>,
								h2: ({ children }) => <Title order={3} mt="md" mb="xs">{children}</Title>,
								h3: ({ children }) => <Title order={4} mt="sm" mb="xs">{children}</Title>,
							}}
						>
							{summary.content as string}
						</ReactMarkdown>
					) : (
						<Alert
							variant="light"
							color="gray"
							icon={<IconInfoCircle size={18} />}
							title="No summary text"
						>
							A row exists for this week, but it doesn't contain
							any content.
						</Alert>
					)}

					{summary.updated_at && (
						<Text c="dimmed" size="xs">
							Updated {formatDate(summary.updated_at)}
						</Text>
					)}
				</Stack>
			) : (
				<EmptyState />
			)}
		</Paper>
	);
}

function EmptyState() {
	return (
		<Stack gap="md" align="flex-start">
			<Title order={5}>No weekly summary yet</Title>
			<Text c="dimmed">
				We couldn't find a summary for the most recently completed week.
			</Text>
		</Stack>
	);
}

function getFormattedWeek(
	weekStart: string | Date | null,
	weekEnd?: string | Date | null,
	tz?: string
) {
	if (!weekStart) return null;
	const start = DateTime.fromISO(
		typeof weekStart === "string" ? weekStart : weekStart.toISOString()
	).setZone(tz ?? undefined);

	const end = weekEnd
		? DateTime.fromISO(
				typeof weekEnd === "string" ? weekEnd : weekEnd.toISOString()
		  ).setZone(tz ?? undefined)
		: start.endOf("week");

	const sameMonth = start.month === end.month && start.year === end.year;
	const label = `Week of ${start.toFormat("MMM d, yyyy")}`;
	const range = sameMonth
		? `${start.toFormat("MMM d")} – ${end.toFormat("d, yyyy")}`
		: `${start.toFormat("MMM d, yyyy")} – ${end.toFormat("MMM d, yyyy")}`;

	return { label, range };
}

function formatDate(d: string | Date) {
	const dt = DateTime.fromISO(typeof d === "string" ? d : d.toISOString());
	return dt.toLocaleString(DateTime.DATETIME_MED_WITH_SECONDS);
}