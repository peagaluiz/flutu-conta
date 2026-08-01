import { createSupabaseForRequest, isAllowedOrigin, withCookies } from "@/server/supabaseServer";

export async function POST(request) {
	if (!isAllowedOrigin(request)) {
		return Response.json({ error: "origin_not_allowed" }, { status: 403 });
	}

	const { supabase, setCookieHeaders, extraHeaders } = createSupabaseForRequest(request);

	// signOut() aciona a remocao dos cookies sb-* via o adapter (setAll com
	// Max-Age=0), acumulados em setCookieHeaders.
	await supabase.auth.signOut();

	return withCookies(null, { status: 204 }, setCookieHeaders, extraHeaders);
}
