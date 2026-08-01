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

	const email = typeof req.body?.email === "string" ? req.body.email.trim() : "";
	const senha = typeof req.body?.senha === "string" ? req.body.senha : "";
	if (!email || !senha) {
		res.status(400).json({ error: "email_e_senha_obrigatorios" });
		return;
	}

	const { supabase, setCookieHeaders, extraHeaders } = createSupabaseForRequest(req);

	const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
	if (error) {
		sendWithCookies(res, 401, { error: error.message }, setCookieHeaders, extraHeaders);
		return;
	}

	sendWithCookies(res, 204, null, setCookieHeaders, extraHeaders);
}
