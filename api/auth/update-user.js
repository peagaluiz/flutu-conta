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

	const { data: userData, error: userError } = await supabase.auth.getUser();
	if (userError || !userData?.user) {
		res.status(401).json({ error: "not_authenticated" });
		return;
	}

	const attrs = {};
	if (typeof req.body?.password === "string" && req.body.password) {
		attrs.password = req.body.password;
	}
	if (req.body?.data && typeof req.body.data === "object") {
		attrs.data = req.body.data;
	}
	if (Object.keys(attrs).length === 0) {
		res.status(400).json({ error: "nada_para_atualizar" });
		return;
	}

	const { data, error } = await supabase.auth.updateUser(attrs);

	if (error) {
		sendWithCookies(res, 400, { error: error.message }, setCookieHeaders, extraHeaders);
		return;
	}

	sendWithCookies(res, 200, { user: data.user }, setCookieHeaders, extraHeaders);
}
