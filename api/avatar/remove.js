import { createSupabaseForRequest, isAllowedOrigin } from "../../server/supabaseServer.js";

const EXTENSIONS = ["jpg", "jpeg", "png", "webp"];

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

	// nunca aceita path do client - deriva sempre do proprio usuario
	// autenticado, senao vira remocao arbitraria de arquivo de outro usuario.
	const paths = EXTENSIONS.map((ext) => `${userData.user.id}.${ext}`);
	const { error } = await supabase.storage.from("avatars").remove(paths);

	if (setCookieHeaders?.length) res.setHeader("Set-Cookie", setCookieHeaders);
	if (extraHeaders) {
		for (const [key, value] of Object.entries(extraHeaders)) res.setHeader(key, value);
	}

	if (error) {
		res.status(400).json({ error: error.message });
		return;
	}

	res.status(204).end();
}
