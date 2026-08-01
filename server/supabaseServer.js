import { createServerClient } from "@supabase/ssr";
import { parse, serialize } from "cookie";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
	throw new Error("SUPABASE_URL/SUPABASE_PUBLISHABLE_KEY ausentes no ambiente do servidor");
}

function toSetCookie(name, value, options) {
	// httpOnly/secure sempre forcados aqui, independente do que a lib mandar -
	// e a garantia central desta migracao (sessao web fora do alcance de JS).
	return serialize(name, value, {
		...options,
		httpOnly: true,
		secure: true,
		sameSite: options?.sameSite ?? "lax",
		path: options?.path ?? "/",
	});
}

// Cria um client Supabase por request (Node req do @vercel/node). Web usa
// cookie httpOnly (via @supabase/ssr); nativo manda Authorization: Bearer e o
// client roda "stateless" (sem cookies).
export function createSupabaseForRequest(req) {
	const cookieHeader = req.headers?.cookie || null;
	const initial = cookieHeader
		? Object.entries(parse(cookieHeader)).map(([name, value]) => ({ name, value: value ?? "" }))
		: [];

	const setCookieHeaders = [];
	const extraHeaders = {};
	const bearer = req.headers?.authorization;

	const supabase = createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
		cookies: {
			getAll() {
				return initial;
			},
			setAll(cookiesToSet, headers) {
				for (const { name, value, options } of cookiesToSet) {
					setCookieHeaders.push(toSetCookie(name, value, options));
				}
				Object.assign(extraHeaders, headers);
			},
		},
		global: bearer ? { headers: { Authorization: bearer } } : undefined,
	});

	return { supabase, setCookieHeaders, extraHeaders };
}

function applyCookiesAndHeaders(res, setCookieHeaders, extraHeaders) {
	if (setCookieHeaders?.length) res.setHeader("Set-Cookie", setCookieHeaders);
	if (extraHeaders) {
		for (const [key, value] of Object.entries(extraHeaders)) res.setHeader(key, value);
	}
}

// Responde com os Set-Cookie e os headers de no-cache que o @supabase/ssr pede
// ao escrever cookie de sessao (evita CDN servir sessao de um usuario a outro).
export function sendWithCookies(res, status, body, setCookieHeaders, extraHeaders) {
	applyCookiesAndHeaders(res, setCookieHeaders, extraHeaders);
	res.status(status);
	if (body === null || body === undefined) {
		res.end();
		return;
	}
	res.json(body);
}

export function redirectWithCookies(res, location, setCookieHeaders, extraHeaders) {
	applyCookiesAndHeaders(res, setCookieHeaders, extraHeaders);
	res.writeHead(302, { Location: location });
	res.end();
}

const ALLOWED_ORIGINS = new Set([process.env.SITE_ORIGIN, "https://flutu-conta.vercel.app"].filter(Boolean));

// CSRF: SameSite=Lax nao cobre todos os casos (ex.: navegacao top-level POST em
// alguns browsers). Requests sem Origin (nativo, com Bearer) passam direto.
export function isAllowedOrigin(req) {
	const origin = req.headers?.origin;
	if (!origin) return true;
	if (ALLOWED_ORIGINS.has(origin)) return true;
	return /^https:\/\/flutu-conta-[a-z0-9-]+\.vercel\.app$/.test(origin);
}
