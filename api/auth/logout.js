import { createSupabaseForRequest, isAllowedOrigin, sendWithCookies } from "../../server/supabaseServer.js";

export default async function handler(req, res) {
	if (req.method !== "POST") {
		res.status(405).json({ error: "method_not_allowed" });
		return;
	}
	if (!isAllowedOrigin(req)) {
		res.status(403).json({ error: "origin_not_allowed" });
		return;
	}

	const { supabase, setCookieHeaders, extraHeaders } = createSupabaseForRequest(req);

	// signOut() aciona a remocao dos cookies sb-* via o adapter (setAll com
	// Max-Age=0), acumulados em setCookieHeaders.
	await supabase.auth.signOut();

	sendWithCookies(res, 204, null, setCookieHeaders, extraHeaders);
}
