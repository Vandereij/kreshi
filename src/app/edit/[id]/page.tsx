// src/app/edit/[id]/page.tsx
import { EditEntryForm } from "@/components/EditEntryForm";
import { BottomNavBar } from "@/components/BottomNavBar";
import { Box } from "@mantine/core";

// Page components in the App Router are Server Components by default.
// They can directly access params without hooks or promises.
export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	return (
		<Box>
			<EditEntryForm id={id} />
			<BottomNavBar />
		</Box>
	);
}