import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import {
	ArrowDown,
	ArrowUp,
	ArrowUpDown,
	Check,
	ChevronLeft,
	ChevronRight,
	Minus,
} from "lucide-react-native";
import { Text } from "@/components/ui/text";

// Tabela de dados genérica para desktop web: ordenação por coluna,
// seleção múltipla (linha + página) e paginação client-side.
// Colunas: { key, label, width?|flex?, align?, sortable?, sortValue?(item), render(item) }

function cellStyle(col) {
	return {
		...(col.width != null ? { width: col.width } : { flex: col.flex ?? 1, minWidth: 0 }),
		paddingHorizontal: 8,
		justifyContent: "center",
		alignItems:
			col.align === "right" ? "flex-end" : col.align === "center" ? "center" : "stretch",
	};
}

function compareValues(va, vb) {
	if (va == null && vb == null) return 0;
	if (va == null) return -1;
	if (vb == null) return 1;
	if (typeof va === "number" && typeof vb === "number") return va - vb;
	return String(va).localeCompare(String(vb), "pt-BR", { numeric: true, sensitivity: "base" });
}

function Checkbox({ checked, indeterminate, disabled, colors, onPress }) {
	const active = checked || indeterminate;
	return (
		<Pressable
			onPress={disabled ? undefined : onPress}
			hitSlop={8}
			style={{
				width: 18,
				height: 18,
				borderRadius: 4,
				borderWidth: 1,
				borderColor: active ? colors.brand : colors.border,
				backgroundColor: active ? colors.brand : "transparent",
				alignItems: "center",
				justifyContent: "center",
				opacity: disabled ? 0.35 : 1,
			}}
		>
			{indeterminate ? (
				<Minus size={13} color="#FFFFFF" strokeWidth={3} />
			) : checked ? (
				<Check size={13} color="#FFFFFF" strokeWidth={3} />
			) : null}
		</Pressable>
	);
}

function PageButton({ icon: Icon, disabled, colors, onPress }) {
	return (
		<Pressable
			onPress={disabled ? undefined : onPress}
			style={({ hovered }) => ({
				width: 30,
				height: 30,
				borderRadius: 8,
				borderWidth: 1,
				borderColor: colors.border,
				backgroundColor: hovered && !disabled ? colors.surfaceMuted : "transparent",
				alignItems: "center",
				justifyContent: "center",
				opacity: disabled ? 0.35 : 1,
			})}
		>
			<Icon size={15} color={colors.textSecondary} />
		</Pressable>
	);
}

export function DataTable({
	columns,
	data,
	getRowId,
	colors,
	pageSize = 8,
	pageResetKey,
	sortResetKey,
	selectable = false,
	selectedIds,
	isRowSelectable,
	onToggleRow,
	onTogglePage,
	highlightId,
	onEndReached,
	loadingMore = false,
	emptyText = "Nenhum registro encontrado.",
}) {
	const [sort, setSort] = useState(null);
	const [page, setPage] = useState(1);

	const sorted = useMemo(() => {
		if (!sort) return data;
		const col = columns.find((c) => c.key === sort.key);
		if (!col) return data;
		const getValue = col.sortValue ?? ((item) => item[col.key]);
		const next = [...data].sort((a, b) => compareValues(getValue(a), getValue(b)));
		return sort.dir === "desc" ? next.reverse() : next;
	}, [data, sort, columns]);

	const total = sorted.length;
	const totalPages = Math.max(1, Math.ceil(total / pageSize));
	const pageStart = (page - 1) * pageSize;
	const pageRows = sorted.slice(pageStart, pageStart + pageSize);

	useEffect(() => {
		setPage(1);
	}, [pageResetKey]);

	// Volta à ordenação padrão (ordem dos dados recebidos) quando o pai pedir
	useEffect(() => {
		setSort(null);
		setPage(1);
	}, [sortResetKey]);

	useEffect(() => {
		if (page > totalPages) setPage(totalPages);
	}, [page, totalPages]);

	// Ao exibir a última página, avisa o pai para buscar mais dados (paging remoto)
	const onEndReachedRef = useRef(onEndReached);
	onEndReachedRef.current = onEndReached;
	useEffect(() => {
		if (page >= totalPages) onEndReachedRef.current?.();
	}, [page, totalPages]);

	useEffect(() => {
		if (highlightId == null || !getRowId) return;
		const idx = sorted.findIndex((item) => String(getRowId(item)) === String(highlightId));
		if (idx >= 0) setPage(Math.floor(idx / pageSize) + 1);
	}, [highlightId, sorted, pageSize, getRowId]);

	const toggleSort = useCallback((col) => {
		setPage(1);
		setSort((prev) => {
			if (prev?.key !== col.key) return { key: col.key, dir: "asc" };
			if (prev.dir === "asc") return { key: col.key, dir: "desc" };
			return null;
		});
	}, []);

	const selectablePageRows = selectable
		? pageRows.filter((item) => (isRowSelectable ? isRowSelectable(item) : true))
		: [];
	const selectedOnPage = selectablePageRows.filter((item) =>
		selectedIds?.has(getRowId(item))
	).length;
	const allPageSelected =
		selectablePageRows.length > 0 && selectedOnPage === selectablePageRows.length;
	const selectionActive = selectable && (selectedIds?.size ?? 0) > 0;

	return (
		<View style={{ width: "100%" }}>
			<View
				style={{
					flexDirection: "row",
					alignItems: "center",
					minHeight: 42,
					paddingHorizontal: 8,
					borderBottomWidth: 1,
					borderBottomColor: colors.border,
					backgroundColor: colors.surfaceMuted,
				}}
			>
				{selectable ? (
					<View style={{ width: 44, alignItems: "center", justifyContent: "center" }}>
						<Checkbox
							checked={allPageSelected}
							indeterminate={!allPageSelected && selectedOnPage > 0}
							disabled={selectablePageRows.length === 0}
							colors={colors}
							onPress={() => onTogglePage?.(selectablePageRows, !allPageSelected)}
						/>
					</View>
				) : null}
				{columns.map((col) => {
					const isSorted = sort?.key === col.key;
					const SortIcon = isSorted
						? sort.dir === "asc"
							? ArrowUp
							: ArrowDown
						: ArrowUpDown;
					const content = (
						<View
							style={{
								flexDirection: col.align === "right" ? "row-reverse" : "row",
								alignItems: "center",
								gap: 4,
							}}
						>
							<Text
								className="text-[11px] font-semibold uppercase"
								numberOfLines={1}
								style={{
									color: isSorted ? colors.textPrimary : colors.textSecondary,
									letterSpacing: 0.4,
								}}
							>
								{col.label}
							</Text>
							{col.sortable ? (
								<SortIcon
									size={12}
									color={isSorted ? colors.textPrimary : colors.textSecondary}
								/>
							) : null}
						</View>
					);
					return (
						<View key={col.key} style={cellStyle(col)}>
							{col.sortable ? (
								<Pressable
									onPress={() => toggleSort(col)}
									style={{
										alignSelf: col.align === "right" ? "flex-end" : "flex-start",
										paddingVertical: 6,
									}}
								>
									{content}
								</Pressable>
							) : (
								content
							)}
						</View>
					);
				})}
			</View>

			{total === 0 ? (
				<View style={{ padding: 40, alignItems: "center" }}>
					<Text className="text-sm" style={{ color: colors.textSecondary }}>
						{emptyText}
					</Text>
				</View>
			) : (
				pageRows.map((item, index) => {
					const id = getRowId(item);
					const rowSelectable =
						selectable && (isRowSelectable ? isRowSelectable(item) : true);
					const isSelected = selectable && !!selectedIds?.has(id);
					const isHighlighted =
						highlightId != null && String(highlightId) === String(id);
					return (
						<Pressable
							key={String(id)}
							disabled={!(rowSelectable && selectionActive)}
							onPress={() => onToggleRow?.(item)}
							style={({ hovered }) => ({
								flexDirection: "row",
								alignItems: "center",
								minHeight: 52,
								paddingHorizontal: 8,
								borderTopWidth: index === 0 ? 0 : 1,
								borderTopColor: colors.border,
								backgroundColor:
									isSelected || isHighlighted || hovered
										? colors.surfaceMuted
										: "transparent",
							})}
						>
							{selectable ? (
								<View
									style={{ width: 44, alignItems: "center", justifyContent: "center" }}
								>
									<Checkbox
										checked={isSelected}
										disabled={!rowSelectable}
										colors={colors}
										onPress={() => onToggleRow?.(item)}
									/>
								</View>
							) : null}
							{columns.map((col) => (
								<View key={col.key} style={cellStyle(col)}>
									{col.render(item)}
								</View>
							))}
						</Pressable>
					);
				})
			)}

			<View
				style={{
					flexDirection: "row",
					alignItems: "center",
					justifyContent: "space-between",
					paddingVertical: 10,
					paddingHorizontal: 16,
					borderTopWidth: 1,
					borderTopColor: colors.border,
				}}
			>
				<Text className="text-xs" style={{ color: colors.textSecondary }}>
					{total === 0
						? "0 de 0"
						: `${pageStart + 1}–${Math.min(pageStart + pageSize, total)} de ${total}`}
				</Text>
				<View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
					{loadingMore ? (
						<ActivityIndicator size="small" color={colors.textSecondary} />
					) : null}
					<PageButton
						icon={ChevronLeft}
						disabled={page <= 1}
						colors={colors}
						onPress={() => setPage((p) => Math.max(1, p - 1))}
					/>
					<Text className="text-xs" style={{ color: colors.textSecondary }}>
						Página {page} de {totalPages}
					</Text>
					<PageButton
						icon={ChevronRight}
						disabled={page >= totalPages}
						colors={colors}
						onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
					/>
				</View>
			</View>
		</View>
	);
}

export default DataTable;
