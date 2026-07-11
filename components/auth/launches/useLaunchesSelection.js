import { useCallback, useEffect, useMemo, useState } from "react";

export function useLaunchesSelection({
	section,
	validItems,
	deleteItemsBulk,
	darBaixaBulk,
	removerBaixaBulk,
}) {
	const [selectedIds, setSelectedIds] = useState(new Set());
	const [baixaDateModalOpen, setBaixaDateModalOpen] = useState(false);
	const selectionMode = selectedIds.size > 0;

	useEffect(() => {
		setSelectedIds(new Set());
	}, [section]);

	const selectedItems = useMemo(
		() => validItems.filter((item) => selectedIds.has(item.id_transacao)),
		[validItems, selectedIds]
	);

	const handleLongPress = useCallback(
		(item) => {
			if (section !== "transacoes" || item?.is_ghost) return;
			setSelectedIds(new Set([item.id_transacao]));
		},
		[section]
	);

	const handleToggleSelect = useCallback((item) => {
		if (item?.is_ghost) return;
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (next.has(item.id_transacao)) {
				next.delete(item.id_transacao);
			} else {
				next.add(item.id_transacao);
			}
			return next;
		});
	}, []);

	const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

	const handleBulkDelete = useCallback(async () => {
		await deleteItemsBulk(selectedIds);
		setSelectedIds(new Set());
	}, [selectedIds, deleteItemsBulk]);

	const handleBulkDarBaixa = useCallback(
		async (date) => {
			await darBaixaBulk(selectedIds, date);
			setSelectedIds(new Set());
		},
		[selectedIds, darBaixaBulk]
	);

	const handleBulkRemoverBaixa = useCallback(async () => {
		await removerBaixaBulk(selectedIds);
		setSelectedIds(new Set());
	}, [selectedIds, removerBaixaBulk]);

	return {
		selectedIds,
		selectedItems,
		selectionMode,
		baixaDateModalOpen,
		setBaixaDateModalOpen,
		handleLongPress,
		handleToggleSelect,
		clearSelection,
		handleBulkDelete,
		handleBulkDarBaixa,
		handleBulkRemoverBaixa,
	};
}
