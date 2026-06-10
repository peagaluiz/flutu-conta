import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { useAuth } from "@/state/AuthContext";
import { useInsertIntercept } from "@/state/InsertInterceptContext";
import { useFinanceDate } from "@/state/FinanceDateContext";

import { useTheme } from "@/components/ui/gluestack-ui-provider/ThemeProvider/ThemeProvider";
import { getThemeColors } from "@/constants/colors";
import { useDatabase } from "@/hooks/useDatabase";

import { Box } from "@/components/ui/box";

import { getSectionConfig, getItemType } from "@/utils/auth/launches/sections";
import { getItemKey } from "@/utils/auth/launches/actions";

import { useLaunchesData } from "@/components/auth/launches/useLaunchesData";
import { useLaunchesEditor } from "@/components/auth/launches/useLaunchesEditor";

import TransacaoCard from "@/components/auth/launches/TransacaoCard";
import PessoaCard from "@/components/auth/launches/PessoaCard";
import ImobilizadoCard from "@/components/auth/launches/ImobilizadoCard";
import RecorrenciaCard from "@/components/auth/launches/RecorrenciaCard";
import BancoCard from "@/components/auth/launches/BancoCard";
import LaunchesHeader from "@/components/auth/launches/LaunchesHeader";
import LaunchesListEmpty from "@/components/auth/launches/LaunchesListEmpty";
import LaunchesFooterLoader from "@/components/auth/launches/LaunchesFooterLoader";
import LaunchesEditorModal from "@/components/auth/launches/LaunchesEditorModal";
import BancoCatalogoSheet from "@/components/auth/launches/BancoCatalogoSheet";
import { LaunchesBulkActions } from "@/components/auth/launches/LaunchesBulkActions";
import { BaixaDateModal } from "@/components/auth/launches/BaixaDateModal";
import { LaunchesFilterModal } from "@/components/auth/launches/LaunchesFilterModal";

const ItemSeparator = () => <Box style={{ height: 10 }} />;

export default function Launches() {
	const insets = useSafeAreaInsets();
	const { theme } = useTheme();
	const colors = getThemeColors(theme);
	const database = useDatabase();
	const { family, userData } = useAuth();

	const { openIntercept } = useInsertIntercept();
	const { highlightId: highlightParam, highlightTs: highlightTsParam } = useLocalSearchParams();

	const [localHighlightId, setLocalHighlightId] = useState(null);
	const scrolledForHighlightRef = useRef(null);

	const { dateRange: finDateRange, dateField: finDateField } = useFinanceDate();
	const [activeFilters, setActiveFilters] = useState(() => ({
		searchText: "",
		dateFrom: finDateRange?.start ?? null,
		dateTo: finDateRange?.end ?? null,
		dateField: finDateField ?? "data_vencimento",
	}));

	useEffect(() => {
		if (!highlightParam || !highlightTsParam) return;
		const id = Number(highlightParam);
		setLocalHighlightId(id);
		scrolledForHighlightRef.current = null;
		setActiveFilters((prev) => ({
			...prev,
			searchText: "",
			dateFrom: null,
			dateTo: null,
		}));
		const timer = setTimeout(() => setLocalHighlightId(null), 3000);
		return () => clearTimeout(timer);
	}, [highlightParam, highlightTsParam]);
	const [filterOpen, setFilterOpen] = useState(false);
	const filterActive = !!(activeFilters.searchText || activeFilters.dateFrom);

	const [section, setSection] = useState("transacoes");
	const config = useMemo(() => getSectionConfig(section), [section]);

	const flatListRef = useRef(null);
	const [selectedIds, setSelectedIds] = useState(new Set());
	const [baixaDateModalOpen, setBaixaDateModalOpen] = useState(false);
	const selectionMode = selectedIds.size > 0;

	useEffect(() => {
		if (localHighlightId) setSection("transacoes");
	}, [localHighlightId]);

	useEffect(() => {
		setSelectedIds(new Set());
	}, [section]);

	const {
		validItems,
		loading,
		refreshing,
		loadingMore,
		loadData,
		onRefresh,
		handleLoadMore,
		deleteItem,
		syncPessoa,
		toggleRecorrenciaStatus,
		darBaixa,
		darBaixaBulk,
		removerBaixaBulk,
		deleteItemsBulk,
	} = useLaunchesData({ database, section, family, userData, filters: activeFilters });

	const {
		editorOpen,
		editorMode,
		editingItem,
		editorValue,
		setEditorValue,
		editorCor,
		setEditorCor,
		selectedPessoaId,
		pessoaOptions,
		savingEditor,
		shareWithFamily,
		setShareWithFamily,
		closeEditor,
		openCreate,
		openEdit,
		selectPessoaOption,
		saveEditor,
		catalogSheetOpen,
		closeCatalogSheet,
		createBancoFromCatalog,
	} = useLaunchesEditor({ database, section, family, userData, loadData });

	const selectedItems = useMemo(
		() => validItems.filter((item) => selectedIds.has(item.id_transacao)),
		[validItems, selectedIds]
	);

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
	}, [localHighlightId, validItems]);

	const handleLongPress = useCallback(
		(item) => {
			if (section !== "transacoes") return;
			setSelectedIds(new Set([item.id_transacao]));
		},
		[section]
	);

	const handleToggleSelect = useCallback((item) => {
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

	const handleCreate = useCallback(() => {
		if (section === "transacoes") {
			openIntercept("launches");
		} else {
			openCreate();
		}
	}, [section, openIntercept, openCreate]);

	const contentStyle = useMemo(
		() => ({
			flexGrow: 1,
			paddingHorizontal: 12,
			paddingTop: 12,
			paddingBottom: insets.bottom + 96,
		}),
		[insets.bottom]
	);

	const renderCard = useCallback(
		(item, index) => {
			const key = String(getItemKey(item, index));
			const itemType = getItemType(item);

			if (itemType === "transacoes") {
				return (
					<TransacaoCard
						key={key}
						item={item}
						colors={colors}
						onEdit={() => openEdit(item)}
						onDelete={() => deleteItem(item)}
						onDarBaixa={() => darBaixa(item)}
						selected={selectedIds.has(item.id_transacao)}
						selectionMode={selectionMode}
						onLongPress={() => handleLongPress(item)}
						onToggleSelect={() => handleToggleSelect(item)}
						isHighlighted={localHighlightId === item.id_transacao}
					/>
				);
			}
			if (itemType === "pessoas") {
				return (
					<PessoaCard
						key={key}
						item={item}
						colors={colors}
						onEdit={() => openEdit(item)}
						onDelete={() => deleteItem(item)}
						onSync={() =>
							Number(item?.is_pending || 0) === 1
								? syncPessoa(item)
								: null
						}
					/>
				);
			}
			if (itemType === "imobilizados") {
				return (
					<ImobilizadoCard
						key={key}
						item={item}
						colors={colors}
						onEdit={() => openEdit(item)}
						onDelete={() => deleteItem(item)}
					/>
				);
			}
			if (itemType === "recorrencias") {
				return (
					<RecorrenciaCard
						key={key}
						item={item}
						colors={colors}
						onToggleStatus={() => toggleRecorrenciaStatus(item)}
						onDelete={() => deleteItem(item)}
					/>
				);
			}
			if (itemType === "bancos") {
				return (
					<BancoCard
						key={key}
						item={item}
						colors={colors}
						onEdit={() => openEdit(item)}
						onDelete={() => deleteItem(item)}
					/>
				);
			}
			return null;
		},
		[
			colors,
			deleteItem,
			openEdit,
			syncPessoa,
			toggleRecorrenciaStatus,
			darBaixa,
			selectedIds,
			selectionMode,
			handleLongPress,
			handleToggleSelect,
			localHighlightId,
		]
	);

	const listHeader = useMemo(
		() => (
			<>
				<LaunchesHeader
					section={section}
					onSectionChange={setSection}
					config={config}
					colors={colors}
					onCreate={handleCreate}
					onFilter={() => setFilterOpen(true)}
					filterActive={filterActive}
				/>
				{selectionMode && section === "transacoes" && (
					<LaunchesBulkActions
						selectedIds={selectedIds}
						selectedItems={selectedItems}
						colors={colors}
						onDelete={handleBulkDelete}
						onDarBaixa={() => setBaixaDateModalOpen(true)}
						onRemoverBaixa={handleBulkRemoverBaixa}
						onClear={clearSelection}
					/>
				)}
			</>
		),
		[
			section,
			config,
			colors,
			handleCreate,
			selectionMode,
			selectedIds,
			selectedItems,
			handleBulkDelete,
			handleBulkRemoverBaixa,
			clearSelection,
			filterActive,
		]
	);

	return (
		<Box style={{ flex: 1, backgroundColor: colors.screen }}>
			<FlatList
				ref={flatListRef}
				contentContainerStyle={contentStyle}
				refreshControl={
					<RefreshControl
						refreshing={refreshing}
						onRefresh={onRefresh}
					/>
				}
				data={validItems}
				keyExtractor={(item, index) => String(getItemKey(item, index))}
				renderItem={({ item, index }) => renderCard(item, index)}
				ItemSeparatorComponent={ItemSeparator}
				ListHeaderComponent={listHeader}
				ListEmptyComponent={
					<LaunchesListEmpty loading={loading} colors={colors} />
				}
				ListFooterComponent={
					section === "transacoes" && loadingMore ? (
						<LaunchesFooterLoader show={loadingMore} />
					) : null
				}
				onEndReached={handleLoadMore}
				onEndReachedThreshold={0.4}
				onScrollToIndexFailed={({ index }) => {
					flatListRef.current?.scrollToOffset({
						offset: index * 90,
						animated: true,
					});
				}}
			/>

			<LaunchesEditorModal
				isOpen={editorOpen}
				onClose={closeEditor}
				editorMode={editorMode}
				section={section}
				editingItem={editingItem}
				editorValue={editorValue}
				setEditorValue={setEditorValue}
				editorCor={editorCor}
				setEditorCor={setEditorCor}
				selectedPessoaId={selectedPessoaId}
				pessoaOptions={pessoaOptions}
				onSelectPessoa={selectPessoaOption}
				shareWithFamily={shareWithFamily}
				setShareWithFamily={setShareWithFamily}
				savingEditor={savingEditor}
				onSave={saveEditor}
				family={family}
				colors={colors}
			/>

			<BancoCatalogoSheet
				isOpen={catalogSheetOpen}
				onClose={closeCatalogSheet}
				onSelect={async (item) => {
					closeCatalogSheet();
					await createBancoFromCatalog(item);
				}}
				colors={colors}
			/>

			<BaixaDateModal
				isOpen={baixaDateModalOpen}
				onClose={() => setBaixaDateModalOpen(false)}
				onApply={handleBulkDarBaixa}
			/>

			<LaunchesFilterModal
				isOpen={filterOpen}
				onClose={() => setFilterOpen(false)}
				onApply={setActiveFilters}
				initialFilters={activeFilters}
				colors={colors}
			/>
		</Box>
	);
}
