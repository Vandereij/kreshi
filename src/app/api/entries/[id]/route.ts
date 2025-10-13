// app/api/entries/[id]/route.ts
import { NextResponse } from "next/server";
import { createClientRSC } from "@/lib/supabase/server"; // Adjust the import path as needed

export async function DELETE(
	request: Request,
	{ params }: { params: { id: string } }
) {
	// Add the 'await' keyword here
	const supabase = await createClientRSC(); 
	const { id } = params;

	// Note: Replace 'journal_entries' with the actual name of your table in Supabase.
	const { error } = await supabase
		.from("journal_entries")
		.delete()
		.match({ id: id });

	if (error) {
		console.error("Supabase error deleting entry:", error);
		return new NextResponse(
			JSON.stringify({ message: "Error deleting entry", error }),
			{ status: 500 }
		);
	}

	return new NextResponse(null, { status: 204 }); // 204 No Content is a standard response for a successful deletion
}