// app/(app)/weekly/page.tsx
import { createClientRSC } from "@/lib/supabase/server";
import WeeklySummaryCard from "@/components/WeeklySummaryCard";
import type { WeeklySummaryRow } from "@/components/WeeklySummaryCard";
import { Container } from "@mantine/core";
import { BottomNavBar } from "@/components/BottomNavBar";

export default async function WeeklyPage() {
	const supabase = await createClientRSC();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	let summary: WeeklySummaryRow | null = null;

	if (user) {
		const { data } = await supabase
			.from("weekly_summaries")
			.select("*")
			.eq("user_id", user.id)
			.order("week_start", { ascending: false })
			.limit(1)
			.maybeSingle();
		summary = (data as WeeklySummaryRow) ?? null;
	}

	return (
		<>
			<Container size="sm" py="xl" pb={120}>
				<WeeklySummaryCard
					summary={summary}
					showMeta
					title="Last Week"
				/>
			</Container>
			<BottomNavBar />
		</>
	);
}
