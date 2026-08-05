import {
	addDays,
	addMonthsClamped,
	addYearsClamped,
	parseISODate,
	toISODate,
} from "@/utils/date";

describe("toISODate", () => {
	it("formata a data local com zero à esquerda", () => {
		expect(toISODate(new Date(2026, 0, 5))).toBe("2026-01-05");
		expect(toISODate(new Date(2026, 11, 31))).toBe("2026-12-31");
	});

	// Meia-noite local em fuso negativo vira o dia anterior em UTC — o helper
	// existe justamente pra não cair nisso.
	it("não desloca o dia por fuso horário", () => {
		expect(toISODate(new Date(2026, 2, 1, 0, 0, 0))).toBe("2026-03-01");
		expect(toISODate(new Date(2026, 2, 1, 23, 59, 59))).toBe("2026-03-01");
	});
});

describe("parseISODate", () => {
	it("devolve a data em horário local", () => {
		const date = parseISODate("2026-01-05");
		expect(date.getFullYear()).toBe(2026);
		expect(date.getMonth()).toBe(0);
		expect(date.getDate()).toBe(5);
	});

	it("devolve null para entradas fora do formato", () => {
		expect(parseISODate(null)).toBeNull();
		expect(parseISODate("")).toBeNull();
		expect(parseISODate("2026-01")).toBeNull();
		expect(parseISODate("05/01/2026")).toBeNull();
		expect(parseISODate("2026-01-05T10:00:00Z")).toBeNull();
	});
});

describe("addDays", () => {
	it("atravessa fim de mês e de ano", () => {
		expect(toISODate(addDays(parseISODate("2026-01-30"), 3))).toBe("2026-02-02");
		expect(toISODate(addDays(parseISODate("2026-12-31"), 1))).toBe("2027-01-01");
		expect(toISODate(addDays(parseISODate("2026-01-01"), -1))).toBe("2025-12-31");
	});

	it("não muta a data recebida", () => {
		const base = parseISODate("2026-01-30");
		addDays(base, 10);
		expect(toISODate(base)).toBe("2026-01-30");
	});
});

describe("addMonthsClamped", () => {
	it("limita o dia ao último dia do mês de destino", () => {
		expect(toISODate(addMonthsClamped(parseISODate("2026-01-31"), 1))).toBe("2026-02-28");
		expect(toISODate(addMonthsClamped(parseISODate("2024-01-31"), 1))).toBe("2024-02-29");
		expect(toISODate(addMonthsClamped(parseISODate("2026-03-31"), 1))).toBe("2026-04-30");
	});

	it("preserva o dia quando o mês de destino comporta", () => {
		expect(toISODate(addMonthsClamped(parseISODate("2026-01-15"), 1))).toBe("2026-02-15");
	});

	it("atravessa o ano nos dois sentidos", () => {
		expect(toISODate(addMonthsClamped(parseISODate("2026-12-15"), 1))).toBe("2027-01-15");
		expect(toISODate(addMonthsClamped(parseISODate("2026-01-15"), -1))).toBe("2025-12-15");
	});
});

describe("addYearsClamped", () => {
	it("trata 29 de fevereiro em ano não bissexto", () => {
		expect(toISODate(addYearsClamped(parseISODate("2024-02-29"), 1))).toBe("2025-02-28");
		expect(toISODate(addYearsClamped(parseISODate("2024-02-29"), 4))).toBe("2028-02-29");
	});
});
