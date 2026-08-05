import {
	buildMonthKeyList,
	monthKeyFromISO,
	monthKeyOf,
	monthKeyToDate,
	parseMonthKey,
	shiftMonthKey,
} from "@/utils/finance/monthKey";

describe("monthKeyOf / monthKeyFromISO", () => {
	it("monta a chave a partir de um Date", () => {
		expect(monthKeyOf(new Date(2026, 0, 5))).toBe("2026-01");
		expect(monthKeyOf(new Date(2026, 11, 31))).toBe("2026-12");
	});

	it("extrai a chave de uma data ISO", () => {
		expect(monthKeyFromISO("2026-01-05")).toBe("2026-01");
		expect(monthKeyFromISO("2026-01")).toBe("2026-01");
	});

	it("devolve null quando não há mês na string", () => {
		expect(monthKeyFromISO(null)).toBeNull();
		expect(monthKeyFromISO("")).toBeNull();
		expect(monthKeyFromISO("2026")).toBeNull();
	});
});

describe("parseMonthKey / monthKeyToDate", () => {
	it("separa ano e mês", () => {
		expect(parseMonthKey("2026-03")).toEqual({ year: 2026, month: 3 });
	});

	it("aponta para o primeiro dia do mês", () => {
		const date = monthKeyToDate("2026-03");
		expect(date.getFullYear()).toBe(2026);
		expect(date.getMonth()).toBe(2);
		expect(date.getDate()).toBe(1);
	});
});

describe("shiftMonthKey", () => {
	it("atravessa a virada de ano", () => {
		expect(shiftMonthKey("2026-01", -1)).toBe("2025-12");
		expect(shiftMonthKey("2026-12", 1)).toBe("2027-01");
	});

	it("aceita deslocamentos de mais de um ano", () => {
		expect(shiftMonthKey("2026-05", 12)).toBe("2027-05");
		expect(shiftMonthKey("2026-05", -17)).toBe("2024-12");
	});

	it("é neutro com delta zero", () => {
		expect(shiftMonthKey("2026-05", 0)).toBe("2026-05");
	});
});

describe("buildMonthKeyList", () => {
	it("inclui os dois extremos", () => {
		expect(buildMonthKeyList("2025-11", "2026-02")).toEqual([
			"2025-11",
			"2025-12",
			"2026-01",
			"2026-02",
		]);
	});

	it("devolve um único mês quando início e fim coincidem", () => {
		expect(buildMonthKeyList("2026-02", "2026-02")).toEqual(["2026-02"]);
	});

	it("devolve lista vazia com intervalo invertido ou chave inválida", () => {
		expect(buildMonthKeyList("2026-05", "2026-02")).toEqual([]);
		expect(buildMonthKeyList("invalido", "2026-02")).toEqual([]);
		expect(buildMonthKeyList("2026-02", null)).toEqual([]);
	});
});
