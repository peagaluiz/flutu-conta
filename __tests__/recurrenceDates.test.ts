import {
	adjustForNonWorking,
	atNoonISO,
	getNextDueDate,
	getValidationHorizon,
} from "@/services/database/recurrenceDates";

describe("getNextDueDate", () => {
	it("soma 7 dias na frequência semanal", () => {
		expect(getNextDueDate("2026-04-03", "semanal")).toBe("2026-04-10");
		expect(getNextDueDate("2026-12-28", "semanal")).toBe("2027-01-04");
	});

	it("soma 1 mês limitando o dia (mensal é o padrão)", () => {
		expect(getNextDueDate("2026-01-15", "mensal")).toBe("2026-02-15");
		expect(getNextDueDate("2026-01-31", "mensal")).toBe("2026-02-28");
		expect(getNextDueDate("2024-01-31", "mensal")).toBe("2024-02-29");
		// frequências desconhecidas (ex.: "dias") caem no comportamento mensal
		expect(getNextDueDate("2026-01-15", "dias" as any)).toBe("2026-02-15");
	});

	it("soma 1 ano tratando 29 de fevereiro", () => {
		expect(getNextDueDate("2026-04-03", "anual")).toBe("2027-04-03");
		expect(getNextDueDate("2024-02-29", "anual")).toBe("2025-02-28");
	});
});

describe("getValidationHorizon", () => {
	it("avança o horizonte conforme a frequência", () => {
		expect(getValidationHorizon("2026-04-03", "semanal")).toBe("2026-04-10");
		expect(getValidationHorizon("2026-04-03", "mensal")).toBe("2026-05-03");
		expect(getValidationHorizon("2026-04-03", "anual")).toBe("2027-04-03");
	});
});

describe("adjustForNonWorking", () => {
	it("não mexe em dia útil", () => {
		// 2026-04-07 é uma terça-feira comum
		expect(adjustForNonWorking("2026-04-07", "after")).toBe("2026-04-07");
		expect(adjustForNonWorking("2026-04-07", "before")).toBe("2026-04-07");
	});

	it("pula domingo", () => {
		// 2026-04-05 é domingo; sábado não é tratado como não útil
		expect(adjustForNonWorking("2026-04-05", "after")).toBe("2026-04-06");
		expect(adjustForNonWorking("2026-04-05", "before")).toBe("2026-04-04");
	});

	it("pula feriado nacional fixo", () => {
		// 25/12/2026 cai numa sexta
		expect(adjustForNonWorking("2026-12-25", "after")).toBe("2026-12-26");
		expect(adjustForNonWorking("2026-12-25", "before")).toBe("2026-12-24");
		// 01/01/2026 cai numa quinta
		expect(adjustForNonWorking("2026-01-01", "after")).toBe("2026-01-02");
	});

	it("pula sexta-feira santa (feriado móvel calculado pela Páscoa)", () => {
		// Páscoa 2026 = 05/04, então a sexta santa é 03/04
		expect(adjustForNonWorking("2026-04-03", "after")).toBe("2026-04-04");
		// Páscoa 2025 = 20/04 → sexta santa 18/04
		expect(adjustForNonWorking("2025-04-18", "after")).toBe("2025-04-19");
		// Páscoa 2024 = 31/03 → sexta santa 29/03
		expect(adjustForNonWorking("2024-03-29", "after")).toBe("2024-03-30");
	});

	it("encadeia dias não úteis seguidos", () => {
		// 01/11/2026 é domingo e 02/11 é feriado (Finados): anda até 03/11
		expect(adjustForNonWorking("2026-11-01", "after")).toBe("2026-11-03");
	});
});

describe("atNoonISO", () => {
	it("fixa meio-dia local, preservando o dia", () => {
		const iso = atNoonISO("2026-04-03");
		const date = new Date(iso);
		expect(date.getFullYear()).toBe(2026);
		expect(date.getMonth()).toBe(3);
		expect(date.getDate()).toBe(3);
		expect(date.getHours()).toBe(12);
	});
});
