// src/components/MoodHeatmapCalendar.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { Calendar } from "@mantine/dates";
import { Paper, Title, Text, useMantineTheme } from "@mantine/core";
import { IconChevronUp, IconChevronDown } from "@tabler/icons-react";
import type { JournalEntry } from "@/app/progress/page";
import type { DayProps, PickerControlProps } from "@mantine/dates";
import classes from "./MoodHeatmapCalendar.module.css";

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
	const today = useMemo(() => {
		const now = new Date();
		now.setHours(0, 0, 0, 0);
		return now;
	}, []);

	useEffect(() => {
		if (selectedDate) {
			setDateInView(selectedDate);
		}
	}, [selectedDate]);

	// Calculate all mood averages efficiently in one go
	const { dailyAverages, monthlyAverages, yearlyAverages } = useMemo(() => {
		const daily: Record<string, { total: number; count: number }> = {};
		const monthly: Record<string, { total: number; count: number }> = {};
		const yearly: Record<string, { total: number; count: number }> = {};

		for (const entry of entries) {
			if (!entry.mood) continue;

			const date = new Date(entry.created_at);
			const moodValue = moodToValue[entry.mood];

			const dayKey = date.toDateString();
			const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
			const yearKey = `${date.getFullYear()}`;

			// Daily
			if (!daily[dayKey]) daily[dayKey] = { total: 0, count: 0 };
			daily[dayKey].total += moodValue;
			daily[dayKey].count++;

			// Monthly
			if (!monthly[monthKey]) monthly[monthKey] = { total: 0, count: 0 };
			monthly[monthKey].total += moodValue;
			monthly[monthKey].count++;

			// Yearly
			if (!yearly[yearKey]) yearly[yearKey] = { total: 0, count: 0 };
			yearly[yearKey].total += moodValue;
			yearly[yearKey].count++;
		}
		return { dailyAverages: daily, monthlyAverages: monthly, yearlyAverages: yearly };
	}, [entries]);

	const getCommonControlProps = (
		isSelected: boolean,
	): { style: React.CSSProperties } => ({
		style: {
			borderRadius: "50%",
			border: `2px solid ${
				isSelected ? theme.colors["brand-charcoal"][8] : "transparent"
			}`,
			color: isSelected ? theme.colors["brand-charcoal"][8] : theme.black,
			width: "36px",
			height: "36px",
			transition: "all 0.2s ease",
			display: "inline-flex",
			alignItems: "center",
			justifyContent: "center",
		},
	});

	const getDayProps = (dateString: string): Partial<DayProps> => {
		const date = new Date(dateString);
		date.setHours(0, 0, 0, 0);

		const isDisabled = date > today;
		const isSelected = selectedDate !== null && date.toDateString() === selectedDate.toDateString();

		const dayData = dailyAverages[date.toDateString()];
		const hasData = dayData && dayData.count > 0;
		const averageMood = hasData ? Math.round(dayData.total / dayData.count) : 0;
		const color = hasData ? heatmapColors[averageMood - 1] : "transparent";

		return {
			disabled: isDisabled,
			onClick: () => onDayClick(date),
			style: {
				...getCommonControlProps(isSelected).style,
				backgroundColor: color,
			},
		};
	};

	const getMonthControlProps = (dateString: string): Partial<PickerControlProps> => {
		const date = new Date(dateString);
		const isSelected =
			date.getMonth() === dateInView.getMonth() &&
			date.getFullYear() === dateInView.getFullYear();
		
		const commonProps = getCommonControlProps(isSelected);
		
		const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
		const monthData = monthlyAverages[monthKey];
		const hasData = monthData && monthData.count > 0;
		const averageMood = hasData ? Math.round(monthData.total / monthData.count) : 0;
		const color = hasData ? heatmapColors[averageMood - 1] : "transparent";

		return {
			...commonProps,
			style: {
				...commonProps.style,
				backgroundColor: color,
				...(isSelected && {
					width: "44px",
					height: "44px",
				}),
			},
			onClick: () => {
				setDateInView(new Date(dateInView.getFullYear(), date.getMonth(), 1));
			},
		};
	};

	const getYearControlProps = (dateString: string): Partial<PickerControlProps> => {
		const date = new Date(dateString);
		const isSelected = date.getFullYear() === dateInView.getFullYear();
		
		const commonProps = getCommonControlProps(isSelected);

		const yearKey = `${date.getFullYear()}`;
		const yearData = yearlyAverages[yearKey];
		const hasData = yearData && yearData.count > 0;
		const averageMood = hasData ? Math.round(yearData.total / yearData.count) : 0;
		const color = hasData ? heatmapColors[averageMood - 1] : "transparent";

		return {
			...commonProps,
			style: {
				...commonProps.style,
				backgroundColor: color,
				...(isSelected && {
					width: "44px",
					height: "44px",
				}),
			},
			onClick: () => {
				setDateInView(new Date(date.getFullYear(), dateInView.getMonth(), 1));
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
				onNextMonth={(dateString) => setDateInView(new Date(dateString))}
				onPreviousMonth={(dateString) => setDateInView(new Date(dateString))}
				getDayProps={getDayProps}
				getMonthControlProps={getMonthControlProps}
				getYearControlProps={getYearControlProps}
				nextIcon={<IconChevronDown size={16} />}
				previousIcon={<IconChevronUp size={16} />}
				className={classes.calendar}
				styles={{
					calendarHeader: {
						width: "200px",
						display: "flex",
						justifyContent: "space-between",
						justifySelf: "center",
						paddingBottom: "5px",
					},
					month: {
						width: "100%",
						borderCollapse: "collapse",
						tableLayout: "fixed",
					},
					monthsList: {
						width: "100%",
						borderCollapse: "collapse",
						tableLayout: "fixed",
					},
					yearsList: {
						width: "100%",
						borderCollapse: "collapse",
						tableLayout: "fixed",
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
						textAlign: "center",
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