import { browserSupabase } from "../../lib/supabaseClient";
const supabase = browserSupabase();

const form = document.getElementById("signup-form") as HTMLFormElement;
const msg = document.getElementById("msg")!;

form.addEventListener("submit", async (e) => {
	e.preventDefault();
	const fd = new FormData(form);

	const full_name = fd.get("full_name") || null;
	const email = fd.get("email") as string;
	const password = fd.get("password") as string;

	// IMPORTANT: Redirect back to your site on Netlify after email confirmation
	const redirectTo = `${window.location.origin}/auth/callback`;

	const { error } = await supabase.auth.signUp({
		email,
		password,
		options: {
			data: { full_name },
			emailRedirectTo: redirectTo,
		},
	});

	if (error) {
		msg.textContent = error.message;
		return;
	}

	msg.textContent = "Check your email to confirm your account.";
	setTimeout(() => (window.location.href = "/auth/login"), 800);
});
