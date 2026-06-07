import { useRef, useState } from "react";
import Animated, {
	FadeInDown,
	FadeOutDown,
	Easing,
} from "react-native-reanimated";
import {
	Funnel,
	SlidersHorizontal,
	Wallet,
	ArrowDownCircle,
	ArrowUpCircle,
	ChevronDown,
	ChevronUp,
} from "lucide-react-native";
import { Box } from "@/components/ui/box";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Modal,
	ModalBackdrop,
	ModalBody,
	ModalContent,
	ModalFooter,
	ModalHeader,
} from "@/components/ui/modal";
import { Button, ButtonText } from "@/components/ui/button";
import { useTheme } from "@/components/ui/gluestack-ui-provider/ThemeProvider/ThemeProvider";
import { getThemeColors } from "@/constants/colors";
import { formatCurrency } from "@/utils/finance/helpers";

const BANKS_INLINE_LIMIT = 3;

function BankRow({ bank, field, colors }) {
	return (
		<Box className="flex-row items-center justify-between">
			<Box className="flex-row items-center gap-2">
				<Box
					className="rounded-full"
					style={{ width: 8, height: 8, backgroundColor: bank.cor_hex || "#6B7280" }}
				/>
				<Text className="text-xs" style={{ color: colors.textSecondary }}>
					{bank.nome}
				</Text>
			</Box>
			<Text className="text-xs font-semibold" style={{ color: colors.textPrimary }}>
				{formatCurrency(bank[field] ?? 0)}
			</Text>
		</Box>
	);
}

function BanksList({ banks, field, colors, onShowAll }) {
	const sorted = [...banks].sort((a, b) => (b[field] ?? 0) - (a[field] ?? 0));
	const visible = sorted.slice(0, BANKS_INLINE_LIMIT);
	const overflow = sorted.length - BANKS_INLINE_LIMIT;

	return (
		<Box className="gap-1 mt-2 pt-2 border-t" style={{ borderColor: colors.border }}>
			{visible.map((bank) => (
				<BankRow key={String(bank.id_banco)} bank={bank} field={field} colors={colors} />
			))}
			{overflow > 0 && (
				<Pressable onPress={onShowAll}>
					<Text
						className="text-xs font-semibold mt-1"
						style={{ color: colors.textSecondary }}
					>
						+{overflow} banco{overflow > 1 ? "s" : ""}
					</Text>
				</Pressable>
			)}
		</Box>
	);
}

function BancosAllModal({ isOpen, onClose, banks, colors }) {
	return (
		<Modal isOpen={isOpen} onClose={onClose} size="md">
			<ModalBackdrop />
			<ModalContent>
				<ModalHeader>
					<Text className="text-lg font-semibold" style={{ color: colors.textPrimary }}>
						Todos os bancos
					</Text>
				</ModalHeader>
				<ModalBody>
					<Box className="gap-3">
						{banks.map((bank) => (
							<Box
								key={String(bank.id_banco)}
								className="flex-row items-center justify-between rounded-xl border px-3 py-3"
								style={{
									backgroundColor: colors.surfaceMuted,
									borderColor: colors.border,
								}}
							>
								<Box className="flex-row items-center gap-2">
									<Box
										className="rounded-full"
										style={{
											width: 10,
											height: 10,
											backgroundColor: bank.cor_hex || "#6B7280",
										}}
									/>
									<Text
										className="font-semibold"
										style={{ color: colors.textPrimary }}
									>
										{bank.nome}
									</Text>
								</Box>
								<Box className="items-end gap-0.5">
									<Text
										className="text-xs font-semibold"
										style={{ color: colors.textPrimary }}
									>
										{formatCurrency(bank.saldo ?? 0)}
									</Text>
									<Text className="text-xs" style={{ color: "#DC2626" }}>
										{formatCurrency(bank.divida ?? 0)} dívida
									</Text>
								</Box>
							</Box>
						))}
					</Box>
				</ModalBody>
				<ModalFooter>
					<Button variant="outline" onPress={onClose}>
						<ButtonText>Fechar</ButtonText>
					</Button>
				</ModalFooter>
			</ModalContent>
		</Modal>
	);
}

export function ResumoFinanceiroCard({
	resumo,
	name,
	dateRangeLabel,
	onPressFilter,
	isFilterActive = false,
	loading = false,
	banks = [],
}) {
	const { theme } = useTheme();
	const colors = getThemeColors(theme);
	const isDarkMode = theme === "dark";
	const [expanded, setExpanded] = useState(false);
	const [showAllBancos, setShowAllBancos] = useState(false);
	const hasToggled = useRef(false);

	const cardStyle = {
		backgroundColor: isDarkMode ? colors.surfaceAlt : colors.surface,
		borderColor: colors.border,
	};
	const infoCardStyle = {
		backgroundColor: colors.surfaceMuted,
		borderColor: colors.border,
	};
	const iconShellStyle = {
		backgroundColor: isDarkMode
			? "rgba(255,255,255,0.08)"
			: colors.surfaceMuted,
	};

	const FilterIcon = isFilterActive ? SlidersHorizontal : Funnel;
	const ExpandIcon = expanded ? ChevronUp : ChevronDown;

	const hasBanks = Array.isArray(banks) && banks.length > 0;

	return (
		<>
			<Box className="rounded-xl px-5 py-5 border gap-4" style={cardStyle}>
				{/* Header */}
				<Box className="flex-row items-center justify-between gap-3">
					<Box className="flex-row items-center gap-2">
						<Box className="rounded-full p-2" style={iconShellStyle}>
							<Wallet size={16} color={colors.textPrimary} />
						</Box>
						<Text
							className="font-semibold"
							style={{ color: colors.textPrimary }}
						>
							Sua carteira
						</Text>
					</Box>

					<Box className="flex-row items-center gap-2">
						{hasBanks && (
							<Pressable onPress={() => { hasToggled.current = true; setExpanded((v) => !v); }}>
								<Box
									className="rounded-full border p-2"
									style={{
										backgroundColor: expanded
											? colors.textPrimary
											: colors.surfaceMuted,
										borderColor: expanded
											? colors.textPrimary
											: colors.border,
									}}
								>
									<ExpandIcon
										size={14}
										color={
											expanded
												? colors.surface
												: colors.textPrimary
										}
									/>
								</Box>
							</Pressable>
						)}

						<Pressable onPress={onPressFilter}>
							<Box
								className="rounded-full border p-2"
								style={{
									backgroundColor: isFilterActive
										? colors.textPrimary
										: colors.surfaceMuted,
									borderColor: isFilterActive
										? colors.textPrimary
										: colors.border,
								}}
							>
								<FilterIcon
									size={14}
									color={
										isFilterActive
											? colors.surface
											: colors.textPrimary
									}
								/>
							</Box>
						</Pressable>
					</Box>
				</Box>

				{/* Greeting */}
				<Box className="gap-1">
					<Text
						className="text-2xl font-bold"
						style={{ color: colors.textPrimary }}
					>
						Olá, {name || "pessoa"}
					</Text>
					<Text
						className="text-sm"
						style={{ color: colors.textSecondary }}
					>
						Aqui está seu resumo financeiro mais importante, sem
						poluição visual.
					</Text>
				</Box>

				{/* Values */}
				<Box className="gap-2">
					{/* Saldo ativo */}
					<Box
						className="rounded-xl border px-3 py-3"
						style={[infoCardStyle, { overflow: "hidden" }]}
					>
						<Text
							className="text-xs"
							style={{ color: colors.textSecondary }}
						>
							Saldo ativo
						</Text>
						<Skeleton
							isLoaded={!loading}
							style={{ height: 24.8, width: 110, borderRadius: 6 }}
						>
							<Text
								className="text-lg font-bold"
								style={{ color: colors.textPrimary }}
							>
								{formatCurrency(resumo.saldo)}
							</Text>
						</Skeleton>

						{expanded && hasBanks && (
							<Animated.View
								entering={FadeInDown.springify().damping(14).stiffness(160).mass(0.8)}
								exiting={FadeOutDown.duration(200).easing(Easing.in(Easing.quad))}
							>
								<BanksList
									banks={banks}
									field="saldo"
									colors={colors}
									onShowAll={() => setShowAllBancos(true)}
								/>
							</Animated.View>
						)}
					</Box>

					{/* Dívidas + A receber */}
					<Box className="flex-row gap-2">
						<Animated.View
							style={{ flex: 1, overflow: "hidden" }}
						>
							<Box
								className="rounded-xl border px-3 py-3"
								style={[infoCardStyle, { flex: 1, overflow: "hidden" }]}
							>
								<Box className="flex-row items-center gap-1 mb-1">
									<ArrowDownCircle size={14} color="#DC2626" />
									<Text
										className="text-xs"
										style={{ color: colors.textSecondary }}
									>
										Dívidas não pagas
									</Text>
								</Box>
								<Skeleton
									isLoaded={!loading}
									style={{ height: 21.3, width: 80, borderRadius: 6 }}
								>
									<Text
										className="font-semibold"
										style={{ color: colors.textPrimary }}
									>
										{formatCurrency(resumo.dividasNaoPagas)}
									</Text>
								</Skeleton>

								{expanded && hasBanks && (
									<Animated.View
										entering={FadeInDown.springify().damping(14).stiffness(160).mass(0.8)}
										exiting={FadeOutDown.duration(200).easing(Easing.in(Easing.quad))}
									>
										<BanksList
											banks={banks}
											field="divida"
											colors={colors}
											onShowAll={() => setShowAllBancos(true)}
										/>
									</Animated.View>
								)}
							</Box>
						</Animated.View>

						{!expanded && (
							<Animated.View
								style={{ flex: 1, overflow: "hidden" }}
							>
								<Box
									className="flex-1 rounded-xl border px-3 py-3"
									style={infoCardStyle}
								>
									<Box className="flex-row items-center gap-1 mb-1">
										<ArrowUpCircle size={14} color="#16A34A" />
										<Text
											className="text-xs"
											style={{ color: colors.textSecondary }}
										>
											A receber pendente
										</Text>
									</Box>
									<Skeleton
										isLoaded={!loading}
										style={{ height: 21.3, width: 80, borderRadius: 6 }}
									>
										<Text
											className="font-semibold"
											style={{ color: colors.textPrimary }}
										>
											{formatCurrency(resumo.receberPendente)}
										</Text>
									</Skeleton>
								</Box>
							</Animated.View>
						)}
					</Box>
				</Box>
			</Box>

			<BancosAllModal
				isOpen={showAllBancos}
				onClose={() => setShowAllBancos(false)}
				banks={banks}
				colors={colors}
			/>
		</>
	);
}
