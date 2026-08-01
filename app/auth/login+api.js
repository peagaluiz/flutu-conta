import { createSupabaseForRequest, isAllowedOrigin, withCookies } from "@/server/supabaseServer";

export async function POST(request) {
	if (!isAllowedOrigin(request)) {
		return Response.json({ error: "origin_not_allowed" }, { status: 403 });
	}

	let body;
	try {
		body = await request.json();
	} catch {
		return Response.json({ error: "invalid_body" }, { status: 400 });
	}

	const email = typeof body?.email === "string" ? body.email.trim() : "";
	const senha = typeof body?.senha === "string" ? body.senha : "";
	if (!email || !senha) {
		return Response.json({ error: "email_e_senha_obrigatorios" }, { status: 400 });
	}

	const { supabase, setCookieHeaders, extraHeaders } = createSupabaseForRequest(request);

	const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
	if (error) {
		return withCookies(
			JSON.stringify({ error: error.message }),
			{ status: 401, headers: { "Content-Type": "application/json" } },
			setCookieHeaders,
			extraHeaders
		);
	}

	return withCookies(null, { status: 204 }, setCookieHeaders, extraHeaders);
}
