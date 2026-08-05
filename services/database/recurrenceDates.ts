import { RecurrenceFrequency } from "@/services/database/types";
import {
	addDays,
	addMonthsClamped,
	addYearsClamped,
	parseISODate,
	toISODate,
} from "@/utils/date";

// Matemática de datas das recorrências: próxima ocorrência, feriados e ajuste
// para dia útil. Sem acesso a banco — tudo função pura.

export function atNoonISO(isoDate: string) {
	const date = parseISODate(isoDate) ?? new Date();
	date.setHours(12, 0, 0, 0);
	return date.toISOString();
}

export function getNextDueDate(currentDueDate: string, frequency: RecurrenceFrequency) {
	const base = parseISODate(currentDueDate) ?? new Date();
	if (frequency === "semanal") return toISODate(addDays(base, 7));
	if (frequency === "anual") return toISODate(addYearsClamped(base, 1));
	return toISODate(addMonthsClamped(base, 1));
}

const BR_FIXED_HOLIDAYS: Array<[number, number]> = [
	[1, 1], [4, 21], [5, 1], [9, 7], [10, 12], [11, 2], [11, 15], [12, 25],
];

function getEasterDate(year: number): Date {
	const a = year % 19;
	const b = Math.floor(year / 100);
	const c = year % 100;
	const d = Math.floor(b / 4);
	const e = b % 4;
	const f = Math.floor((b + 8) / 25);
	const g = Math.floor((b - f + 1) / 3);
	const h = (19 * a + b - d - g + 15) % 30;
	const i = Math.floor(c / 4);
	const k = c % 4;
	const l = (32 + 2 * e + 2 * i - h - k) % 7;
	const m = Math.floor((a + 11 * h + 22 * l) / 451);
	const month = Math.floor((h + l - 7 * m + 114) / 31);
	const day = ((h + l - 7 * m + 114) % 31) + 1;
	return new Date(year, month - 1, day);
}

function isNonWorkingDay(isoDate: string): boolean {
	const d = parseISODate(isoDate);
	if (!d) return false;
	if (d.getDay() === 0) return true;
	const month = d.getMonth() + 1;
	const day = d.getDate();
	if (BR_FIXED_HOLIDAYS.some(([m, dd]) => m === month && dd === day)) return true;
	const goodFriday = addDays(getEasterDate(d.getFullYear()), -2);
	if (toISODate(goodFriday) === isoDate) return true;
	return false;
}

export function adjustForNonWorking(isoDate: string, direction: "before" | "after"): string {
	let current = isoDate;
	const step = direction === "before" ? -1 : 1;
	let safety = 0;
	while (isNonWorkingDay(current) && safety < 14) {
		current = toISODate(addDays(parseISODate(current)!, step));
		safety++;
	}
	return current;
}

export function getValidationHorizon(todayISO: string, frequency: RecurrenceFrequency) {
	const today = parseISODate(todayISO) ?? new Date();
	if (frequency === "semanal") return toISODate(addDays(today, 7));
	if (frequency === "anual") return toISODate(addYearsClamped(today, 1));
	return toISODate(addMonthsClamped(today, 1));
}
