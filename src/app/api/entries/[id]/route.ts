// app/api/entries/[id]/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { createClientRSC } from "@/lib/supabase/server";

export async function DELETE(
	request: NextRequest,
	context: { params: { id: string } }
) {
	try {
		const supabase = await createClientRSC();
		// Destructure the 'id' from context.params
		const { id } = context.params;

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

		return new NextResponse(null, { status: 204 });
	} catch (e) {
		console.error("Error in DELETE handler:", e);
		return new NextResponse(
			JSON.stringify({ message: "An unexpected error occurred." }),
			{ status: 500 }
		);
	}
}
