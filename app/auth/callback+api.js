import { createSupabaseForRequest, withCookies } from "@/server/supabaseServer";

function safeNextPath(next) {
	// so aceita caminho relativo interno - nunca redirecionar pra origem externa
	// (open redirect).
	if (typeof next === "string" && next.startsWith("/") && !next.startsWith("//")) {
		return next;
	}
	return "/";
}

export async function GET(request) {
	const url = new URL(request.url);
	const code = url.searchParams.get("code");
	const next = safeNextPath(url.searchParams.get("next"));

	const { supabase, setCookieHeaders, extraHeaders } = createSupabaseForRequest(request);

	if (!code) {
		return withCookies(null, { status: 302, headers: { Location: "/login" } }, setCookieHeaders, extraHeaders);
	}

	const { error } = await supabase.auth.exchangeCodeForSession(code);
	if (error) {
		return withCookies(
			null,
			{ status: 302, headers: { Location: "/login" } },
			setCookieHeaders,
			extraHeaders
		);
	}

	return withCookies(null, { status: 302, headers: { Location: next } }, setCookieHeaders, extraHeaders);
}
