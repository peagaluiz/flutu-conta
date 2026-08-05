// visibility.ts importa o client do Supabase só para resolver a sessão quando o
// chamador não informa userId — nada disso é exercitado aqui.
jest.mock("@/services/supabase/client", () => ({ supabase: {} }));
jest.mock("@/services/auth/currentUserCache", () => ({
	getCurrentUserCache: () => ({ id: null, familyId: null }),
}));

import {
	applySupabaseVisibility,
	buildSqlVisibilityClause,
	type VisibilityContext,
} from "@/services/database/visibility";

const USER = "user-1";
const FAMILY = 7;

function context(overrides: Partial<VisibilityContext> = {}): VisibilityContext {
	return { scope: "all", userId: USER, familyId: FAMILY, ...overrides };
}

// Dublê do query builder do supabase-js: registra as chamadas encadeadas.
function fakeQuery() {
	const calls: Array<{ method: string; args: any[] }> = [];
	const query: any = {
		calls,
		eq: (...args: any[]) => {
			calls.push({ method: "eq", args });
			return query;
		},
		or: (...args: any[]) => {
			calls.push({ method: "or", args });
			return query;
		},
	};
	return query;
}

describe("buildSqlVisibilityClause", () => {
	it("não filtra nada quando não há usuário resolvido", () => {
		expect(buildSqlVisibilityClause("t", context({ userId: null }))).toEqual({
			where: "1=1",
			args: [],
		});
	});

	it("escopo 'mine' filtra só pelo dono", () => {
		expect(buildSqlVisibilityClause("t", context({ scope: "mine" }))).toEqual({
			where: "t.user_id = ?",
			args: [USER],
		});
	});

	it("escopo 'all' une próprios e da família", () => {
		expect(buildSqlVisibilityClause("t", context())).toEqual({
			where: "(t.user_id = ? OR t.family_id = ?)",
			args: [USER, FAMILY],
		});
	});

	it("sem família, qualquer escopo cai no dono", () => {
		const noFamily = context({ familyId: null });
		expect(buildSqlVisibilityClause("t", noFamily).where).toBe("t.user_id = ?");
		expect(buildSqlVisibilityClause("t", { ...noFamily, scope: "family" }).where).toBe(
			"t.user_id = ?"
		);
	});

	it("escopo 'family' é estrito por padrão (só registros da família)", () => {
		expect(buildSqlVisibilityClause("t", context({ scope: "family" }))).toEqual({
			where: "t.family_id = ?",
			args: [FAMILY],
		});
	});

	// Bancos e faturas passam strictFamily: false — no escopo "família" os
	// registros próprios continuam visíveis (comportamento herdado).
	it("escopo 'family' com strictFamily: false mantém os próprios", () => {
		expect(
			buildSqlVisibilityClause("b", context({ scope: "family" }), { strictFamily: false })
		).toEqual({
			where: "(b.user_id = ? OR b.family_id = ?)",
			args: [USER, FAMILY],
		});
	});

	it("usa o prefixo de alias recebido", () => {
		expect(buildSqlVisibilityClause("r", context({ scope: "mine" })).where).toBe(
			"r.user_id = ?"
		);
	});
});

describe("applySupabaseVisibility", () => {
	it("devolve a query intacta sem usuário resolvido", () => {
		const query = fakeQuery();
		expect(applySupabaseVisibility(query, context({ userId: null }))).toBe(query);
		expect(query.calls).toHaveLength(0);
	});

	it("escopo 'mine' usa eq(user_id)", () => {
		const query = fakeQuery();
		applySupabaseVisibility(query, context({ scope: "mine" }));
		expect(query.calls).toEqual([{ method: "eq", args: ["user_id", USER] }]);
	});

	it("escopo 'all' usa or(user_id, family_id)", () => {
		const query = fakeQuery();
		applySupabaseVisibility(query, context());
		expect(query.calls).toEqual([
			{ method: "or", args: [`user_id.eq.${USER},family_id.eq.${FAMILY}`] },
		]);
	});

	it("escopo 'family' estrito usa eq(family_id)", () => {
		const query = fakeQuery();
		applySupabaseVisibility(query, context({ scope: "family" }));
		expect(query.calls).toEqual([{ method: "eq", args: ["family_id", FAMILY] }]);
	});

	it("escopo 'family' com strictFamily: false volta a unir os próprios", () => {
		const query = fakeQuery();
		applySupabaseVisibility(query, context({ scope: "family" }), { strictFamily: false });
		expect(query.calls).toEqual([
			{ method: "or", args: [`user_id.eq.${USER},family_id.eq.${FAMILY}`] },
		]);
	});
});

// A cláusula SQL e o filtro do Supabase precisam representar a mesma regra —
// se um mudar sem o outro, web e nativo passam a mostrar conjuntos diferentes.
describe("paridade entre SQL local e Supabase", () => {
	const scopes: Array<VisibilityContext["scope"]> = ["mine", "family", "all"];

	it.each(scopes)("escopo '%s' filtra pelos mesmos campos", (scope) => {
		const ctx = context({ scope });
		const sql = buildSqlVisibilityClause("t", ctx);
		const query = fakeQuery();
		applySupabaseVisibility(query, ctx);

		const sqlUsesUser = sql.where.includes("user_id");
		const sqlUsesFamily = sql.where.includes("family_id");
		const call = query.calls[0];
		const remoteFilter = String(call.args.join(" "));

		expect(remoteFilter.includes("user_id")).toBe(sqlUsesUser);
		expect(remoteFilter.includes("family_id")).toBe(sqlUsesFamily);
	});
});
