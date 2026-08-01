import { createSupabaseForRequest, redirectWithCookies } from "../../server/supabaseServer.js";

function safeNextPath(next) {
	// so aceita caminho relativo interno - nunca redirecionar pra origem externa
	// (open redirect).
	if (typeof next === "string" && next.startsWith("/") && !next.startsWith("//")) {
		return next;
	}
	return "/";
}

export default async function handler(req, res) {
	const url = new URL(req.url, `https://${req.headers.host}`);
	const code = url.searchParams.get("code");
	const next = safeNextPath(url.searchParams.get("next"));

	const { supabase, setCookieHeaders, extraHeaders } = createSupabaseForRequest(req);

	if (!code) {
		redirectWithCookies(res, "/login", setCookieHeaders, extraHeaders);
		return;
	}

	const { error } = await supabase.auth.exchangeCodeForSession(code);
	redirectWithCookies(res, error ? "/login" : next, setCookieHeaders, extraHeaders);
}
