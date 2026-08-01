// Cache em memoria do usuario atual, usado pelos repositories (bancoRepository,
// faturaRepository, manageRepository, recurrenceService, transacoesRepository)
// como fallback de userId/familyId quando o caller nao passa esses params
// explicitamente. No web, supabase.auth.getSession() sempre retorna null (o
// client la nao gerencia sessao - ela vive no cookie httpOnly do BFF), entao
// esse fallback nao pode depender do supabase-js. AuthContext.tsx atualiza
// este cache toda vez que o usuario muda.
let cached = { id: null, email: null, familyId: null };

export function setCurrentUserCache(user) {
	cached = { id: user?.id ?? null, email: user?.email ?? null, familyId: user?.familyId ?? null };
}

export function getCurrentUserCache() {
	return cached;
}
