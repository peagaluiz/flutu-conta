import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/state/AuthContext";
import { useInsertIntercept } from "@/state/InsertInterceptContext";

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

const ItemSeparator = () => <Box style={{ height: 10 }} />;

export default function Launches() {
	const insets = useSafeAreaInsets();
	const { theme } = useTheme();
	const colors = getThemeColors(theme);
	const database = useDatabase();
	const { family, userData } = useAuth();

	const { openIntercept } = useInsertIntercept();
	const [section, setSection] = useState("transacoes");
	const config = useMemo(() => getSectionConfig(section), [section]);

	const [selectedIds, setSelectedIds] = useState(new Set());
	const [baixaDateModalOpen, setBaixaDateModalOpen] = useState(false);
	const selectionMode = selectedIds.size > 0;

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
	} = useLaunchesData({ database, section, family, userData });

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
			openIntercept();
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
		]
	);

	return (
		<Box style={{ flex: 1, backgroundColor: colors.screen }}>
			<FlatList
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
		</Box>
	);
}
