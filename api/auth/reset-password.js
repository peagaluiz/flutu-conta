import { createSupabaseForRequest, isAllowedOrigin } from "../../server/supabaseServer.js";

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
	if (!email) {
		res.status(400).json({ error: "email_obrigatorio" });
		return;
	}

	const { supabase } = createSupabaseForRequest(req);
	const redirectTo = `https://${req.headers.host}/api/auth/callback?next=/nova-senha`;

	const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

	// Nunca revela se o email existe ou nao (evita user enumeration) - sempre
	// 204, mesmo se o Supabase reportar erro (so loga pro nosso lado).
	if (error) {
		console.error("resetPasswordForEmail falhou:", error.message);
	}

	res.status(204).end();
}
