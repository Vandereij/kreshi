// app/api/entries/[id]/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { createClientRSC } from "@/lib/supabase/server";

/**
 * Defines the shape of the context object passed to the route handler.
 * This context includes the dynamic route parameters.
 */
type RouteContext = {
  params: {
    id: string;
  };
};

/**
 * Handles the DELETE request to remove a specific journal entry.
 * @param request - The incoming NextRequest object.
 * @param context - The context object containing route parameters (e.g., { params: { id: '...' } }).
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const supabase = await createClientRSC();
    // Extract the 'id' from the context's params object.
    const { id } = context.params;

    if (!id) {
      return new NextResponse(
        JSON.stringify({ message: "Error: Entry ID is missing." }),
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("journal_entries")
      .delete()
      .match({ id: id });

    if (error) {
      console.error("Supabase error deleting entry:", error);
      return new NextResponse(
        JSON.stringify({ message: "Error deleting entry from database", error }),
        { status: 500 }
      );
    }

    // A 204 No Content response is standard and correct for a successful deletion.
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    console.error("Error in DELETE handler:", e);
    // This catches unexpected server-side errors (e.g., Supabase client failing to initialize).
    return new NextResponse(
      JSON.stringify({ message: "An unexpected internal error occurred." }),
      { status: 500 }
    );
  }
}