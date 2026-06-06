import React, { useEffect, useMemo, useState, useCallback } from "react";
import { RefreshControl, ScrollView } from "react-native";
import { DatePickerDialog } from "@/components/ui/DatePickerDialog";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/components/ui/gluestack-ui-provider/ThemeProvider/ThemeProvider";
import { getThemeColors } from "@/constants/colors";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { Button, ButtonText } from "@/components/ui/button";
import {
	Modal,
	ModalBackdrop,
	ModalBody,
	ModalContent,
	ModalFooter,
	ModalHeader,
} from "@/components/ui/modal";
import { CalendarDays, ChevronDown } from "lucide-react-native";

import { useDatabase } from "@/hooks/useDatabase";
import { useAuth } from "@/state/AuthContext";
import { Box } from "@/components/ui/box";
import { ResumoFinanceiroCard } from "@/components/finance/home/ResumoFinanceiroCard";
import { HomeQuickActionsSection } from "@/components/finance/home/HomeQuickActionsSection";
import { HomeTransactionsSection } from "@/components/finance/home/HomeTransactionsSection";
import {
	buildInsertParams,
	buildDefaultHomeDateRange,
	buildQuickActions,
	calculateResumo,
	filterLancamentosByRange,
	formatHomeDateRangeLabel,
	getLatestLancamento,
} from "@/utils/finance/homeScreenHelpers";
import { toISODateString } from "@/utils/finance/helpers";

const VISIBILITY_OPTIONS = [
	{ value: "all", label: "Todos" },
	{ value: "mine", label: "Meus" },
	{ value: "family", label: "Família" },
];

export default function HomeFinanceList() {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const { theme } = useTheme();
	const colors = getThemeColors(theme);
	const database = useDatabase();
	const { userData, family } = useAuth();

	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [lancamentos, setLancamentos] = useState([]);
	const [banks, setBanks] = useState([]);
	const [showFilterSheet, setShowFilterSheet] = useState(false);
	const [filterType, setFilterType] = useState("all");
	const [visibilityScope, setVisibilityScope] = useState("all");
	const [dateRange, setDateRange] = useState(() => buildDefaultHomeDateRange());
	const [filterModalOpen, setFilterModalOpen] = useState(false);
	const [showRangePicker, setShowRangePicker] = useState(false);
	const [pendingStart, setPendingStart] = useState(null);
	const [pendingEnd, setPendingEnd] = useState(null);
	const bottomSpacing = insets.bottom + 96;
	const hasFamily = Number(family?.id || userData?.familyId || 0) > 0;
	const activeFamilyId =
		Number(family?.id || userData?.familyId || 0) || null;

	const ultimoLancamento = useMemo(
		() => getLatestLancamento(lancamentos),
		[lancamentos]
	);

	const ultimaCategoria = ultimoLancamento?.categoria?.trim() || "";
	const ultimoTipo =
		ultimoLancamento?.tipo === "receber" ? "receber" : "pagar";
	const todayISO = useMemo(() => toISODateString(new Date()), []);
	const dateRangeLabel = useMemo(
		() => formatHomeDateRangeLabel(dateRange.start, dateRange.end),
		[dateRange.end, dateRange.start]
	);

	const defaultRange = useMemo(() => buildDefaultHomeDateRange(), []);
	const isFilterActive =
		dateRange.start !== defaultRange.start ||
		dateRange.end !== defaultRange.end;

	const openInsert = useCallback(
		(params = {}) => {
			router.push({
				pathname: "/(auth)/(stack)/insert",
				params: buildInsertParams(todayISO, params),
			});
		},
		[router, todayISO]
	);

	const openFilterModal = useCallback(() => {
		setPendingStart(dateRange.start);
		setPendingEnd(dateRange.end);
		setFilterModalOpen(true);
	}, [dateRange.start, dateRange.end]);

	const closeFilterModal = useCallback(() => {
		setFilterModalOpen(false);
		setShowRangePicker(false);
	}, []);

	const handleRangeConfirm = useCallback(({ startDate, endDate }) => {
		setShowRangePicker(false);
		if (startDate) setPendingStart(toISODateString(startDate));
		if (endDate) setPendingEnd(toISODateString(endDate));
	}, []);

	const handleApplyFilters = useCallback(() => {
		if (pendingStart && pendingEnd) {
			setDateRange({ start: pendingStart, end: pendingEnd });
		}
		setFilterModalOpen(false);
	}, [pendingStart, pendingEnd]);

	const quickActions = useMemo(
		() =>
			buildQuickActions({
				ultimaCategoria,
				ultimoTipo,
				onOpenInsert: openInsert,
			}),
		[ultimaCategoria, ultimoTipo, openInsert]
	);

	const lancamentosFiltrados = useMemo(
		() => filterLancamentosByRange(lancamentos, filterType),
		[lancamentos, filterType]
	);

	const resumo = useMemo(() => calculateResumo(lancamentos), [lancamentos]);

	const banksResumo = useMemo(() => {
		if (!banks.length) return [];
		return banks.map((bank) => {
			const bt = lancamentos.filter((t) => Number(t.id_banco) === Number(bank.id_banco));
			const saldo = bt
				.filter((t) => t.tipo === "receber" && t.status === "pago")
				.reduce((s, t) => s + Number(t.valor || 0), 0);
			const divida = bt
				.filter((t) => t.tipo === "pagar" && t.status === "pendente")
				.reduce((s, t) => s + Number(t.valor || 0), 0);
			return { ...bank, saldo, divida };
		});
	}, [banks, lancamentos]);

	const loadLancamentos = useCallback(
		async (options = { silent: false }) => {
			const silent = !!options?.silent;
			try {
				if (!silent) {
					setLoading(true);
				}
				const [data, bancoData] = await Promise.all([
					database.getTransacao(undefined, {
						dateFrom: dateRange.start,
						dateTo: dateRange.end,
						visibilityScope: hasFamily ? visibilityScope : "mine",
						userId: userData?.id ?? null,
						familyId: activeFamilyId,
					}),
					database.listBancos({
						visibilityScope: hasFamily ? visibilityScope : "mine",
						userId: userData?.id ?? null,
						familyId: activeFamilyId,
					}),
				]);
				setLancamentos(Array.isArray(data) ? data : []);
				setBanks(Array.isArray(bancoData) ? bancoData : []);
			} catch {
				setLancamentos([]);
			} finally {
				if (!silent) {
					setLoading(false);
				}
			}
		},
		[
			activeFamilyId,
			database,
			dateRange.end,
			dateRange.start,
			hasFamily,
			userData?.id,
			visibilityScope,
		]
	);

	useEffect(() => {
		let active = true;

		(async () => {
			try {
				setLoading(true);
				const [data, bancoData] = await Promise.all([
					database.getTransacao(undefined, {
						dateFrom: dateRange.start,
						dateTo: dateRange.end,
						visibilityScope: hasFamily ? visibilityScope : "mine",
						userId: userData?.id ?? null,
						familyId: activeFamilyId,
					}),
					database.listBancos({
						visibilityScope: hasFamily ? visibilityScope : "mine",
						userId: userData?.id ?? null,
						familyId: activeFamilyId,
					}),
				]);
				if (active) {
					setLancamentos(Array.isArray(data) ? data : []);
					setBanks(Array.isArray(bancoData) ? bancoData : []);
				}
			} catch {
				if (active) {
					setLancamentos([]);
				}
			} finally {
				if (active) {
					setLoading(false);
				}
			}
		})();

		return () => {
			active = false;
		};
	}, [
		activeFamilyId,
		database,
		dateRange.end,
		dateRange.start,
		hasFamily,
		userData?.id,
		visibilityScope,
	]);

	useEffect(() => {
		if (!hasFamily && visibilityScope !== "mine") {
			setVisibilityScope("mine");
		}
	}, [hasFamily, visibilityScope]);

	const onRefresh = async () => {
		setRefreshing(true);
		try {
			await database.syncAllPendingData({ force: true });
			await loadLancamentos({ silent: true });
		} finally {
			setRefreshing(false);
		}
	};

	const handlePressItem = (item) => {
		router.replace({
			pathname: "/(auth)/(stack)/insert",
			params: { id_transacao: String(item.id_transacao) },
		});
	};

	return (
		<>
			<ScrollView
				style={{ backgroundColor: colors.screen }}
				contentContainerStyle={{
					flexGrow: 1,
					paddingBottom: bottomSpacing,
				}}
				refreshControl={
					<RefreshControl
						refreshing={refreshing}
						onRefresh={onRefresh}
					/>
				}
			>
				<Box className="gap-4 px-3 pt-3" style={{ minHeight: "100%" }}>
					<ResumoFinanceiroCard
						resumo={resumo}
						name={userData?.nome}
						dateRangeLabel={dateRangeLabel}
						onPressFilter={openFilterModal}
						loading={loading}
						isFilterActive={isFilterActive}
						banks={banksResumo}
					/>
					<HomeQuickActionsSection actions={quickActions} />
					{hasFamily && <Box
						className="rounded-xl border p-3"
						style={{
							backgroundColor: colors.surface,
							borderColor: colors.border,
						}}
					>
						<HStack className="items-center justify-between">
							<Text
								className="text-sm font-semibold"
								style={{ color: colors.textPrimary }}
							>
								Visão da home
							</Text>
							<HStack className="gap-2">
								{VISIBILITY_OPTIONS.map((option) => {
									const active =
										option.value === visibilityScope;
									return (
										<Pressable
											key={option.value}
											onPress={() =>
												setVisibilityScope(option.value)
											}
										>
											<Box
												className="rounded-full border px-3 py-1"
												style={{
													borderColor: active
														? colors.textPrimary
														: colors.border,
													backgroundColor: active
														? colors.textPrimary
														: colors.surface,
												}}
											>
												<Text
													className="text-xs font-medium"
													style={{
														color: active
															? colors.surface
															: colors.textSecondary,
													}}
												>
													{option.label}
												</Text>
											</Box>
										</Pressable>
									);
								})}
							</HStack>
						</HStack>
					</Box>}
					<HomeTransactionsSection
						loading={loading}
						items={lancamentosFiltrados}
						filterType={filterType}
						isFilterSheetOpen={showFilterSheet}
						onOpenFilterSheet={() => setShowFilterSheet(true)}
						onCloseFilterSheet={() => setShowFilterSheet(false)}
						onChangeFilter={setFilterType}
						onPressItem={handlePressItem}
						onPressSeeAll={() =>
							router.push("/(auth)/(tabs)/launches")
						}
					/>
				</Box>
			</ScrollView>

			<Modal isOpen={filterModalOpen} onClose={closeFilterModal} size="md">
				<ModalBackdrop />
				<ModalContent>
					<ModalHeader>
						<Text
							className="text-lg font-semibold"
							style={{ color: colors.textPrimary }}
						>
							Filtrar por período
						</Text>
					</ModalHeader>

					<ModalBody>
						<Box className="gap-2">
							<Text
								className="text-xs"
								style={{ color: colors.textSecondary }}
							>
								Período
							</Text>
							<Pressable onPress={() => setShowRangePicker(true)}>
								<Box
									className="flex-row items-center justify-between rounded-xl border px-3 py-3"
									style={{
										backgroundColor: colors.surfaceMuted,
										borderColor: colors.border,
									}}
								>
									<HStack className="items-center gap-2">
										<CalendarDays
											size={16}
											color={colors.textPrimary}
										/>
										<Text
											style={{
												color:
													pendingStart && pendingEnd
														? colors.textPrimary
														: colors.textSecondary,
											}}
										>
											{pendingStart && pendingEnd
												? `${pendingStart.split("-").reverse().join("/")} até ${pendingEnd.split("-").reverse().join("/")}`
												: "Selecionar período"}
										</Text>
									</HStack>
									<ChevronDown
										size={16}
										color={colors.textSecondary}
									/>
								</Box>
							</Pressable>
						</Box>
					</ModalBody>

					<ModalFooter>
						<HStack className="gap-2 flex-1">
							<Button
								variant="outline"
								className="flex-1"
								onPress={closeFilterModal}
							>
								<ButtonText>Cancelar</ButtonText>
							</Button>
							<Button
								className="flex-1"
								onPress={handleApplyFilters}
							>
								<ButtonText>Aplicar Filtros</ButtonText>
							</Button>
						</HStack>
					</ModalFooter>
				</ModalContent>
			</Modal>

			<DatePickerDialog
				visible={showRangePicker}
				locale="pt"
				mode="range"
				startDate={
					pendingStart
						? new Date(`${pendingStart}T00:00:00`)
						: undefined
				}
				endDate={
					pendingEnd
						? new Date(`${pendingEnd}T12:00:00`)
						: undefined
				}
				onDismiss={() => setShowRangePicker(false)}
				onConfirm={handleRangeConfirm}
			/>
		</>
	);
}
