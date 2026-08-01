import { router } from "expo-router";

// Guarda pra so redirecionar pro login UMA vez por sessao de 401s seguidos -
// sem isso, varias chamadas falhando ao mesmo tempo empilhariam redirects.
let hasRedirectedForAuth = false;

export function resetApiFetchRedirectGuard() {
	hasRedirectedForAuth = false;
}

// Usado tanto direto (chamadas a /api/auth/*, /api/avatar/*) quanto como
// global.fetch do client supabase-js do web (chamadas a /db/rest/v1/*) - por
// isso aceita RequestInfo|URL, nao so path relativo.
export async function apiFetch(input, options = {}) {
	const { suppressAuthRedirect, ...init } = options;

	const res = await fetch(input, {
		...init,
		credentials: "include",
	});

	if (res.status === 401 && !suppressAuthRedirect && !hasRedirectedForAuth) {
		hasRedirectedForAuth = true;
		router.replace("/login");
	}

	return res;
}
