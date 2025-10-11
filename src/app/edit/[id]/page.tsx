// src/app/edit/[id]/page.tsx
import { EditEntryForm } from "@/components/EditEntryForm";
import { BottomNavBar } from "@/components/BottomNavBar";
import { Box } from "@mantine/core";

// Define the expected props for the page component
type EditPageProps = {
  params: { id: string };
  searchParams: { [key: string]: string | string[] | undefined };
};

// Page components in the App Router are Server Components by default.
// They can directly access params without hooks or promises.
export default function EditPage({ params }: EditPageProps) {
	// Here, we pass the id to the client component as a simple string prop.
	return (
		<Box>
			<EditEntryForm id={params.id} />
			<BottomNavBar />
		</Box>
	);
}