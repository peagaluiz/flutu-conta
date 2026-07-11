import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/state/AuthContext";

import { useTheme } from "@/components/ui/gluestack-ui-provider/ThemeProvider/ThemeProvider";
import { getThemeColors } from "@/constants/colors";
import { useDatabase } from "@/hooks/useDatabase";
import { useIsDesktopWeb } from "@/hooks/useIsDesktopWeb";

import { Box } from "@/components/ui/box";

import { getSectionConfig } from "@/utils/auth/launches/sections";
import { getItemKey } from "@/utils/auth/launches/actions";
import { getTableColumns } from "@/utils/auth/launches/tableColumns";

import { useLaunchesData } from "@/components/auth/launches/useLaunchesData";
import { useLaunchesEditor } from "@/components/auth/launches/useLaunchesEditor";
import {
	useLaunchesFilters,
	useHighlightScroll,
} from "@/components/auth/launches/useLaunchesFilters";
import { useLaunchesSelection } from "@/components/auth/launches/useLaunchesSelection";

import LaunchesTableHeader from "@/components/auth/launches/table/LaunchesTableHeader";
import LaunchesListItem from "@/components/auth/launches/LaunchesListItem";
import LaunchesHeader from "@/components/auth/launches/LaunchesHeader";
import LaunchesListEmpty from "@/components/auth/launches/LaunchesListEmpty";
import LaunchesFooterLoader from "@/components/auth/launches/LaunchesFooterLoader";
import LaunchesModals from "@/components/auth/launches/LaunchesModals";
import { LaunchesBulkActions } from "@/components/auth/launches/LaunchesBulkActions";

export default function LaunchesMobileScreen() {
	const insets = useSafeAreaInsets();
	const { theme } = useTheme();
	const colors = getThemeColors(theme);
	const database = useDatabase();
	const { family, userData } = useAuth();
	const isDesktopWeb = useIsDesktopWeb();

	const [section, setSection] = useState("transacoes");
	const config = useMemo(() => getSectionConfig(section), [section]);
	const columns = useMemo(() => getTableColumns(section, colors), [section, colors]);

	const [ofxModalOpen, setOfxModalOpen] = useState(false);
	const flatListRef = useRef(null);

	const {
		activeFilters,
		filterActive,
		searchText,
		setSearchText,
		localHighlightId,
		highlightTs,
		setHighlightDateOverride,
		filterOpen,
		setFilterOpen,
	} = useLaunchesFilters();

	useEffect(() => {
		if (localHighlightId) setSection("transacoes");
	}, [localHighlightId]);

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
		deleteRecorrenciaScope,
	} = useLaunchesData({ database, section, family, userData, filters: activeFilters });

	// Recarrega ao voltar de fluxos que alteram dados (ex.: importação OFX navega com highlightTs)
	useEffect(() => {
		if (highlightTs) loadData(section);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [highlightTs]);

	const editor = useLaunchesEditor({ database, section, family, userData, loadData });

	const selection = useLaunchesSelection({
		section,
		validItems,
		deleteItemsBulk,
		darBaixaBulk,
		removerBaixaBulk,
	});

	useHighlightScroll({ flatListRef, localHighlightId, highlightTs, validItems });

	const contentStyle = useMemo(
		() => ({
			flexGrow: 1,
			paddingHorizontal: isDesktopWeb ? 24 : 12,
			paddingTop: 12,
			paddingBottom: insets.bottom + 96,
		}),
		[insets.bottom, isDesktopWeb]
	);

	const renderSeparator = useCallback(
		() =>
			isDesktopWeb ? (
				<Box
					style={{
						height: 1,
						width: "100%",
						maxWidth: 1100,
						alignSelf: "center",
						backgroundColor: colors.border,
					}}
				/>
			) : (
				<Box style={{ height: 10 }} />
			),
		[isDesktopWeb, colors.border]
	);

	const renderItem = useCallback(
		({ item }) => (
			<LaunchesListItem
				item={item}
				section={section}
				columns={columns}
				colors={colors}
				isDesktopWeb={isDesktopWeb}
				selected={selection.selectedIds.has(item.id_transacao)}
				selectionMode={selection.selectionMode}
				isHighlighted={localHighlightId === item.id_transacao}
				onEdit={editor.openEdit}
				onDelete={deleteItem}
				onDarBaixa={darBaixa}
				onSyncPessoa={syncPessoa}
				onToggleRecorrenciaStatus={toggleRecorrenciaStatus}
				onDeleteRecorrenciaScope={deleteRecorrenciaScope}
				onLongPress={selection.handleLongPress}
				onToggleSelect={selection.handleToggleSelect}
			/>
		),
		[
			section,
			columns,
			colors,
			isDesktopWeb,
			selection.selectedIds,
			selection.selectionMode,
			selection.handleLongPress,
			selection.handleToggleSelect,
			localHighlightId,
			editor.openEdit,
			deleteItem,
			darBaixa,
			syncPessoa,
			toggleRecorrenciaStatus,
			deleteRecorrenciaScope,
		]
	);

	const listHeader = (
		<>
			<LaunchesHeader
				section={section}
				onSectionChange={setSection}
				config={config}
				colors={colors}
				onCreate={editor.openCreate}
				onFilter={() => {
					setHighlightDateOverride(false);
					setFilterOpen(true);
				}}
				onImportOfx={() => setOfxModalOpen(true)}
				filterActive={filterActive}
			/>
			{selection.selectionMode && section === "transacoes" && (
				<LaunchesBulkActions
					selectedIds={selection.selectedIds}
					selectedItems={selection.selectedItems}
					colors={colors}
					onDelete={selection.handleBulkDelete}
					onDarBaixa={() => selection.setBaixaDateModalOpen(true)}
					onRemoverBaixa={selection.handleBulkRemoverBaixa}
					onClear={selection.clearSelection}
				/>
			)}
			{isDesktopWeb && validItems.length > 0 && (
				<LaunchesTableHeader columns={columns} section={section} colors={colors} />
			)}
		</>
	);

	return (
		<Box style={{ flex: 1, backgroundColor: colors.screen }}>
			<FlatList
				ref={flatListRef}
				contentContainerStyle={contentStyle}
				refreshControl={
					<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
				}
				data={validItems}
				keyExtractor={(item, index) => String(getItemKey(item, index))}
				renderItem={renderItem}
				ItemSeparatorComponent={renderSeparator}
				ListHeaderComponent={listHeader}
				ListEmptyComponent={<LaunchesListEmpty loading={loading} colors={colors} />}
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

			<LaunchesModals
				editor={editor}
				section={section}
				family={family}
				userData={userData}
				colors={colors}
				searchText={searchText}
				onApplySearch={setSearchText}
				filterOpen={filterOpen}
				onCloseFilter={() => setFilterOpen(false)}
				baixaDateModalOpen={selection.baixaDateModalOpen}
				onCloseBaixaDate={() => selection.setBaixaDateModalOpen(false)}
				onApplyBaixaDate={selection.handleBulkDarBaixa}
				ofxModalOpen={ofxModalOpen}
				onCloseOfx={() => setOfxModalOpen(false)}
			/>
		</Box>
	);
}
