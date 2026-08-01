import { createSupabaseForRequest, withCookies } from "@/server/supabaseServer";

export async function GET(request) {
	const { supabase, setCookieHeaders, extraHeaders } = createSupabaseForRequest(request);

	// getUser() revalida contra o servidor Supabase - nunca getSession(), que so
	// le o que veio no cookie/local sem confirmar que ainda e valido.
	const { data, error } = await supabase.auth.getUser();

	if (error || !data?.user) {
		return withCookies(
			JSON.stringify({ error: "not_authenticated" }),
			{ status: 401, headers: { "Content-Type": "application/json" } },
			setCookieHeaders,
			extraHeaders
		);
	}

	return withCookies(
		JSON.stringify({ user: data.user }),
		{ status: 200, headers: { "Content-Type": "application/json" } },
		setCookieHeaders,
		extraHeaders
	);
}
