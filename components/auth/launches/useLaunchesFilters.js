import { useEffect, useMemo, useRef, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { useFinanceDate } from "@/state/FinanceDateContext";
import { buildDefaultHomeDateRange } from "@/utils/finance/homeScreenHelpers";

export function useLaunchesFilters() {
	const { dateRange, dateField } = useFinanceDate();
	const { highlightId: highlightParam, highlightTs: highlightTsParam } = useLocalSearchParams();

	const [searchText, setSearchText] = useState("");
	const [highlightDateOverride, setHighlightDateOverride] = useState(false);
	const [localHighlightId, setLocalHighlightId] = useState(null);
	const [filterOpen, setFilterOpen] = useState(false);

	const activeFilters = useMemo(
		() => ({
			searchText,
			dateFrom: highlightDateOverride ? null : dateRange?.start ?? null,
			dateTo: highlightDateOverride ? null : dateRange?.end ?? null,
			dateField: dateField ?? "data_vencimento",
		}),
		[searchText, highlightDateOverride, dateRange?.start, dateRange?.end, dateField]
	);

	useEffect(() => {
		if (!highlightParam || !highlightTsParam) return;
		setLocalHighlightId(Number(highlightParam));
		setSearchText("");
		setHighlightDateOverride(true);
		const timer = setTimeout(() => setLocalHighlightId(null), 3000);
		return () => clearTimeout(timer);
	}, [highlightParam, highlightTsParam]);

	// Alterar o período manualmente desliga o override criado pelo highlight
	const lastRangeRef = useRef(null);
	useEffect(() => {
		const key = `${dateRange?.start}|${dateRange?.end}`;
		if (lastRangeRef.current !== null && lastRangeRef.current !== key) {
			setHighlightDateOverride(false);
		}
		lastRangeRef.current = key;
	}, [dateRange?.start, dateRange?.end]);

	const defaultRange = useMemo(() => buildDefaultHomeDateRange(), []);
	const filterActive =
		!!searchText ||
		(!highlightDateOverride &&
			(dateRange?.start !== defaultRange.start ||
				dateRange?.end !== defaultRange.end));

	return {
		activeFilters,
		filterActive,
		searchText,
		setSearchText,
		localHighlightId,
		highlightTs: highlightTsParam,
		setHighlightDateOverride,
		filterOpen,
		setFilterOpen,
	};
}

export function useHighlightScroll({ flatListRef, localHighlightId, highlightTs, validItems }) {
	const scrolledForHighlightRef = useRef(null);

	useEffect(() => {
		scrolledForHighlightRef.current = null;
	}, [highlightTs]);

	useEffect(() => {
		if (!localHighlightId || !validItems.length) return;
		if (scrolledForHighlightRef.current === localHighlightId) return;
		const idx = validItems.findIndex((item) => item.id_transacao === localHighlightId);
		if (idx < 0) return;
		const timer = setTimeout(() => {
			scrolledForHighlightRef.current = localHighlightId;
			flatListRef.current?.scrollToIndex({
				index: idx,
				animated: true,
				viewPosition: 0.4,
			});
		}, 400);
		return () => clearTimeout(timer);
	}, [localHighlightId, validItems, flatListRef]);
}
