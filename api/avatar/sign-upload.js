import { createSupabaseForRequest, isAllowedOrigin } from "../../server/supabaseServer.js";

const ALLOWED_EXT = new Set(["jpg", "jpeg", "png", "webp"]);

export default async function handler(req, res) {
	if (req.method !== "POST") {
		res.status(405).json({ error: "method_not_allowed" });
		return;
	}
	if (!isAllowedOrigin(req)) {
		res.status(403).json({ error: "origin_not_allowed" });
		return;
	}

	const ext = typeof req.body?.ext === "string" ? req.body.ext.toLowerCase() : "";
	if (!ALLOWED_EXT.has(ext)) {
		res.status(400).json({ error: "extensao_invalida" });
		return;
	}

	const { supabase, setCookieHeaders, extraHeaders } = createSupabaseForRequest(req);
	const { data: userData, error: userError } = await supabase.auth.getUser();
	if (userError || !userData?.user) {
		res.status(401).json({ error: "not_authenticated" });
		return;
	}

	// mesmo padrao ja usado hoje pelo nativo (AuthContext.tsx) - a policy de
	// INSERT do bucket avatars exige que o path comece com o auth.uid().
	const path = `${userData.user.id}.${ext}`;

	const { data, error } = await supabase.storage.from("avatars").createSignedUploadUrl(path, { upsert: true });

	if (setCookieHeaders?.length) res.setHeader("Set-Cookie", setCookieHeaders);
	if (extraHeaders) {
		for (const [key, value] of Object.entries(extraHeaders)) res.setHeader(key, value);
	}

	if (error || !data) {
		res.status(400).json({ error: error?.message ?? "falha_ao_assinar_upload" });
		return;
	}

	res.status(200).json({ signedUrl: data.signedUrl, token: data.token, path: data.path });
}
