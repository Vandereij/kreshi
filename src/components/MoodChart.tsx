// src/components/MoodChart.tsx
"use client";

import {
	LineChart,
	Line,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
} from "recharts";
import { Paper, Title } from "@mantine/core";

export function MoodChart({ data }: { data: string[] }) {
	return (
		<Paper>
			{" "}
			{/* Uses default styles from theme */}
			<Title order={4} fw={700}>
				Mood Over Time
			</Title>
			<ResponsiveContainer width="100%" height={300}>
				<LineChart
					data={data}
					margin={{ top: 20, right: 20, left: -10, bottom: 5 }}
				>
					<CartesianGrid strokeDasharray="3 3" stroke="#EEDDD8" />{" "}
					{/* brand-beige[2] */}
					<XAxis dataKey="date" stroke="#5E5E5E" fontSize={12} />{" "}
					{/* brand-charcoal[6] */}
					<YAxis
						stroke="#5E5E5E"
						fontSize={12}
						domain={[1, 5]}
						ticks={[1, 2, 3, 4, 5]}
						tickFormatter={(value) =>
							["Awful", "Bad", "Okay", "Good", "Great"][value - 1]
						}
					/>
					<Tooltip
						contentStyle={{
							borderRadius: "12px",
							borderColor: "#EEDDD8",
						}}
						formatter={(value: number) => [
							value,
							["Awful", "Bad", "Okay", "Good", "Great"][
								value - 1
							],
						]}
					/>
					<Line
						type="monotone"
						dataKey="mood"
						stroke="#1C1C1C" // brand-charcoal[9]
						strokeWidth={3}
						dot={{ r: 5, fill: "#1C1C1C" }}
						activeDot={{ r: 8 }}
					/>
				</LineChart>
			</ResponsiveContainer>
		</Paper>
	);
}
