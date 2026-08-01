import { createSupabaseForRequest, sendWithCookies } from "../../server/supabaseServer.js";

export default async function handler(req, res) {
	const { supabase, setCookieHeaders, extraHeaders } = createSupabaseForRequest(req);

	// getUser() revalida contra o servidor Supabase - nunca getSession(), que so
	// le o que veio no cookie/local sem confirmar que ainda e valido.
	const { data, error } = await supabase.auth.getUser();

	if (error || !data?.user) {
		sendWithCookies(res, 401, { error: "not_authenticated" }, setCookieHeaders, extraHeaders);
		return;
	}

	sendWithCookies(res, 200, { user: data.user }, setCookieHeaders, extraHeaders);
}
