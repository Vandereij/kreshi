// app/api/entries/[id]/route.ts 
import { NextResponse } from "next/server"; 
import { createClientRSC } from "@/lib/supabase/server"; 
 
export async function DELETE( 
  request: Request, 
  context: { params: Promise<{ id: string }> } 
) { 
  try { 
    const supabase = await createClientRSC(); 
    const { id } = await context.params; 
 
    if (!id) { 
      return NextResponse.json( 
        { message: "Error: Entry ID is missing from the URL." }, 
        { status: 400 } 
      ); 
    } 
 
    const { error } = await supabase 
      .from("journal_entries") 
      .delete() 
      .eq("id", id); 
 
    if (error) { 
      console.error("Supabase error deleting entry:", error); 
      return NextResponse.json( 
        { message: "Error deleting entry from database" }, 
        { status: 500 } 
      ); 
    } 
 
    return new NextResponse(null, { status: 204 }); 
  } catch (e) { 
    console.error("Error in DELETE handler:", e); 
    return NextResponse.json( 
      { message: "An unexpected internal server error occurred." }, 
      { status: 500 } 
    ); 
  } 
}