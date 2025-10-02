// src/components/MoodHeatmapCalendar.tsx
"use client";

import { useState } from "react";
import { Calendar } from "@mantine/dates";
import { Paper, Title, Text, useMantineTheme, ActionIcon } from "@mantine/core";
import { IconChevronUp, IconChevronDown } from "@tabler/icons-react";
import type { JournalEntry } from "@/app/progress/page";
import type { DayProps } from "@mantine/dates";

const moodToValue: { [key: string]: number } = {
	awful: 1,
	bad: 2,
	okay: 3,
	good: 4,
	great: 5,
};
const heatmapColors = ["#F7C6B4", "#F8D6B7", "#FFE6C1", "#FFF4D4", "#B6E5A8"];

interface MoodHeatmapCalendarProps {
	entries: JournalEntry[];
	onDayClick: (date: Date | null) => void;
	selectedDate: Date | null;
}

export function MoodHeatmapCalendar({
	entries,
	onDayClick,
	selectedDate,
}: MoodHeatmapCalendarProps) {
	const theme = useMantineTheme();
	const [dateInView, setDateInView] = useState(selectedDate || new Date());

	const dailyAverages = entries.reduce((acc, entry) => {
		const entryDate = new Date(entry.created_at).toDateString();
		const moodValue = entry.mood ? moodToValue[entry.mood] : 0;
		if (!acc[entryDate]) acc[entryDate] = { total: 0, count: 0 };
		if (moodValue > 0) {
			acc[entryDate].total += moodValue;
			acc[entryDate].count++;
		}
		return acc;
	}, {} as Record<string, { total: number; count: number }>);

	const getDayProps = (dateString: string): Partial<DayProps> => {
		const date = new Date(dateString);
		const isSelected =
			selectedDate && date.toDateString() === selectedDate.toDateString();
		const dayData = dailyAverages[date.toDateString()];
		const hasData = dayData && dayData.count > 0;
		const averageMood = hasData
			? Math.round(dayData.total / dayData.count)
			: 0;
		const color = hasData ? heatmapColors[averageMood - 1] : "transparent";

		return {
			onClick: () => onDayClick(date),
			style: {
				borderRadius: "50%",
				backgroundColor: hasData ? color : "transparent",
				border: `2px solid ${
					isSelected
						? theme.colors["brand-charcoal"][8]
						: "transparent"
				}`,
				color: isSelected
					? theme.colors["brand-charcoal"][8]
					: theme.black,
				width: "36px",
				height: "36px",
				transition: "all 0.2s ease",
			},
		};
	};

	return (
		<Paper>
			<Title order={4} fw={700}>
				Your Mood Calendar
			</Title>
			<Text size="sm" c="dimmed" mb="md">
				Click a day to see your entries.
			</Text>
			<Calendar
				date={dateInView}
				onDateChange={(dateString) => {
					if (dateString) {
						setDateInView(new Date(dateString));
					}
				}}
				getDayProps={getDayProps}
				nextIcon={<IconChevronDown size={16} />}
				previousIcon={<IconChevronUp size={16} />}
				styles={{
					month: {
						width: "100%",
						borderCollapse: "collapse",
						tableLayout: "fixed", // This ensures columns are of equal width
					},
					monthsList: {
						width: "100%",
						borderCollapse: "collapse",
						tableLayout: "fixed", // This ensures columns are of equal width
					},
					yearsList: {
						width: "100%",
						borderCollapse: "collapse",
						tableLayout: "fixed", // This ensures columns are of equal width
					},
					monthCell: {
						textAlign: "center",
						padding: 0,
					},
					monthsListCell: {
						textAlign: "center",
						padding: 0,
					},
					yearsListCell: {
						textAlign: "center",
						padding: 0,
					},
					weekday: {
						color: theme.colors.gray[5],
						fontWeight: 400,
						fontSize: theme.fontSizes.sm,
						textAlign: "center", // Center the Mo, Tu, We...
						paddingBottom: "5px",
					},
					day: {
						padding: 0,
						textAlign: "center",
						"&[dataOutside]": {
							pointerEvents: "none",
							opacity: 0,
						},
						"&:hover": { backgroundColor: "transparent" },
					},
				}}
			/>
		</Paper>
	);
}
