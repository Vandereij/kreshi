import { browserSupabase } from "../../lib/supabaseClient";
const supabase = browserSupabase();

// Give Supabase a tick to parse URL hash/code and set the session.
setTimeout(async () => {
	const {
		data: { session },
		error,
	} = await supabase.auth.getSession();
	if (error) console.warn(error);
	// Optional: handle error UX here
	window.location.replace("/app/checkin");
}, 0);
