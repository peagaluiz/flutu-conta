// ============================================================================
// ATENCAO / SECURITY-CRITICAL
// Este proxy usa a PUBLISHABLE key + o token do usuario. A barreira de acesso e
// o RLS. NUNCA troque a publishable key por SERVICE_ROLE / SECRET key aqui para
// "resolver um 403": isso desliga o RLS e transforma este endpoint em acesso
// IRRESTRITO ao banco para qualquer request. Um 403/401 aqui = corrigir RLS ou
// o token do usuario, NUNCA elevar privilegio do proxy.
//
// Montado como function de nome FIXO (nao dynamic route com colchetes) porque
// o roteamento dinamico por arquivo ([...path].js) fica atras dos rewrites
// customizados na precedencia da Vercel - um rewrite pra ele nunca "achava" a
// function (sempre caia no fallback da SPA). Rewrite /db/(.*) -> /api/db?
// __path=$1 (vercel.json) funciona pq aponta pra uma function de nome fixo,
// que E resolvida antes dos rewrites. O client web aponta pra `${origin}/db`.
// ============================================================================

import { createSupabaseForRequest, isAllowedOrigin } from "../server/supabaseServer.js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;

// tipo_imobilizado ganhou POST porque, apos a Etapa 1 (user_id + RLS por
// dono), o fluxo web de criar imobilizado passa a inserir a linha "Geral" do
// proprio usuario via este proxy (services/database/manageRepository.ts).
const TABLE_ALLOWLIST = {
	banco: new Set(["GET", "POST", "PATCH", "DELETE"]),
	banco_catalogo: new Set(["GET"]),
	categoria_catalogo: new Set(["GET"]),
	cartao_faturas: new Set(["GET", "POST", "PATCH", "DELETE"]),
	imobilizado: new Set(["GET", "POST", "PATCH", "DELETE"]),
	tipo_imobilizado: new Set(["GET", "POST"]),
	pessoa: new Set(["GET", "POST", "PATCH", "DELETE"]),
	transacoes: new Set(["GET", "POST", "PATCH", "DELETE"]),
	recorrencias: new Set(["GET", "POST", "PATCH", "DELETE"]),
	recorrencia_transacoes: new Set(["GET", "POST", "DELETE"]),
	finance_recurrence_read_model: new Set(["GET"]),
	familias: new Set(["GET", "POST", "PATCH", "DELETE"]),
	familia_membros: new Set(["GET", "POST", "PATCH", "DELETE"]),
	familia_convites: new Set(["GET", "POST", "PATCH", "DELETE"]),
	profiles: new Set(["GET", "PATCH"]),
};

// deny-all por padrao: so libera nominalmente funcoes que existem no banco
// e que o codigo realmente chama. get_family_snapshot e SECURITY INVOKER
// (RLS de familia_membros/familias/familia_convites vale normal).
const RPC_ALLOWLIST = new Set(["get_family_snapshot"]);

const PREFER_ALLOWLIST = new Set([
	"return=representation",
	"return=minimal",
	"count=exact",
	"resolution=merge-duplicates",
]);

const UPSTREAM_TIMEOUT_MS = 10000;

// Rate limit best-effort EM MEMORIA POR INSTANCIA. As functions da Vercel sao
// efemeras e escalam horizontalmente, entao este contador NAO e compartilhado
// entre instancias - protege contra abuso trivial de uma unica origem, nao
// contra ataque distribuido. Nada de Upstash/Redis neste corte (decisao do
// dono).
const RATE_LIMIT_WINDOW_MS = 10000;
const RATE_LIMIT_MAX = 60;
const rateBuckets = new Map();

function isRateLimited(key) {
	const now = Date.now();
	const bucket = rateBuckets.get(key);
	if (!bucket || now - bucket.windowStart > RATE_LIMIT_WINDOW_MS) {
		rateBuckets.set(key, { windowStart: now, count: 1 });
		return false;
	}
	bucket.count += 1;
	return bucket.count > RATE_LIMIT_MAX;
}

function clientIp(req) {
	const forwarded = req.headers["x-forwarded-for"];
	if (typeof forwarded === "string" && forwarded.length > 0) return forwarded.split(",")[0].trim();
	return req.socket?.remoteAddress || "unknown";
}

function filterPrefer(preferHeader) {
	if (!preferHeader) return null;
	const allowed = preferHeader
		.split(",")
		.map((token) => token.trim())
		.filter((token) => PREFER_ALLOWLIST.has(token));
	return allowed.length > 0 ? allowed.join(", ") : null;
}

export default async function handler(req, res) {
	const method = req.method || "GET";

	if (isRateLimited(clientIp(req))) {
		res.status(429).json({ error: "rate_limited" });
		return;
	}

	if (method !== "GET" && method !== "HEAD" && !isAllowedOrigin(req)) {
		res.status(403).json({ error: "origin_not_allowed" });
		return;
	}

	const url = new URL(req.url, `https://${req.headers.host}`);
	const rawPath = url.searchParams.get("__path") || "";
	url.searchParams.delete("__path");
	const pathSegments = rawPath.split("/").filter(Boolean);
	const [first, ...rest] = pathSegments;

	if (first === "rpc") {
		const fnName = rest.join("/");
		if (!RPC_ALLOWLIST.has(fnName)) {
			// Formato identico ao erro real do PostgREST pra funcao inexistente
			// (PGRST202) - o client (familyRepository.ts) ja trata esse codigo
			// especificamente como "cair no fallback", entao negar por aqui e
			// indistinguivel de "nao implementado", sem precisar de nenhuma
			// mudanca no codigo que consome isso.
			res.status(404).json({
				code: "PGRST202",
				message: `Could not find the function public.${fnName}`,
			});
			return;
		}
	} else {
		const allowedMethods = TABLE_ALLOWLIST[first];
		if (!allowedMethods) {
			res.status(404).json({ error: "table_not_allowed" });
			return;
		}
		if (!allowedMethods.has(method)) {
			res.status(405).json({ error: "method_not_allowed" });
			return;
		}
	}

	const { supabase, setCookieHeaders, extraHeaders } = createSupabaseForRequest(req);

	// getUser() revalida no servidor - so entao pegamos o token cru (via
	// getSession, que normalmente e local/sem rede) pra repassar ao PostgREST.
	// A barreira de verdade e o proprio PostgREST validando o JWT + RLS.
	const { data: userData, error: userError } = await supabase.auth.getUser();
	if (userError || !userData?.user) {
		res.status(401).json({ error: "not_authenticated" });
		return;
	}

	const { data: sessionData } = await supabase.auth.getSession();
	const accessToken = sessionData?.session?.access_token;
	if (!accessToken) {
		res.status(401).json({ error: "not_authenticated" });
		return;
	}

	if (setCookieHeaders?.length) res.setHeader("Set-Cookie", setCookieHeaders);
	if (extraHeaders) {
		for (const [key, value] of Object.entries(extraHeaders)) res.setHeader(key, value);
	}

	const search = url.searchParams.toString();
	const upstreamUrl = `${SUPABASE_URL}/rest/v1/${pathSegments.map(encodeURIComponent).join("/")}${search ? `?${search}` : ""}`;

	const upstreamHeaders = new Headers();
	upstreamHeaders.set("apikey", SUPABASE_PUBLISHABLE_KEY); // server-only
	upstreamHeaders.set("Authorization", `Bearer ${accessToken}`); // do cookie/bearer
	upstreamHeaders.set("Accept-Profile", "public"); // FIXO. nunca do client
	upstreamHeaders.set("Content-Profile", "public"); // FIXO. nunca do client
	upstreamHeaders.set("Accept", "application/json");
	if (method === "POST" || method === "PATCH") {
		upstreamHeaders.set("Content-Type", "application/json");
	}

	const prefer = filterPrefer(req.headers["prefer"]);
	if (prefer) upstreamHeaders.set("Prefer", prefer);

	const hasBody = method === "POST" || method === "PATCH";
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

	let upstreamRes;
	try {
		upstreamRes = await fetch(upstreamUrl, {
			method,
			headers: upstreamHeaders,
			body: hasBody ? JSON.stringify(req.body ?? {}) : undefined,
			signal: controller.signal,
		});
	} catch (err) {
		clearTimeout(timer);
		if (err?.name === "AbortError") {
			res.status(504).json({ error: "upstream_timeout" });
			return;
		}
		res.status(502).json({ error: "upstream_error" });
		return;
	}
	clearTimeout(timer);

	const text = await upstreamRes.text();
	res.status(upstreamRes.status);
	const contentType = upstreamRes.headers.get("content-type");
	if (contentType) res.setHeader("Content-Type", contentType);
	const contentRange = upstreamRes.headers.get("content-range");
	if (contentRange) res.setHeader("Content-Range", contentRange);
	res.send(text);
}
