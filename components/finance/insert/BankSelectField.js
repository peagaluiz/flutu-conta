import { useState } from "react";
import { Image } from "react-native";
import { Building2, ChevronDown, X, CreditCard } from "lucide-react-native";
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from "@/components/ui/pressable";
import {
	FormControl,
	FormControlLabel,
	FormControlLabelText,
} from "@/components/ui/form-control";
import BancoSelectSheet from "@/components/finance/insert/BancoSelectSheet";

function BankLogo({ banco, size = 22 }) {
	const src = banco?.logo_local_path || banco?.logo_url || null;
	if (src) {
		return (
			<Image
				source={{ uri: src }}
				style={{ width: size, height: size, borderRadius: size / 2 }}
			/>
		);
	}
	return (
		<Box
			style={{
				width: size,
				height: size,
				borderRadius: size / 2,
				backgroundColor: banco?.cor_hex ?? "#6B7280",
				justifyContent: "center",
				alignItems: "center",
			}}
		>
			<Building2 size={13} color="#FFFFFF" />
		</Box>
	);
}

// Seletor de banco em formato de campo (largura total), no lugar do avatar do
// header. Reaproveita o BancoSelectSheet — só troca o gatilho.
export function BankSelectField({
	selectedCatalogBanco,
	onSelect,
	themeColors,
	isDarkMode,
	actionSheetContentStyle,
	disabled = false,
	userId = null,
	familyId = null,
}) {
	const [open, setOpen] = useState(false);
	const has = !!selectedCatalogBanco;
	const isCartao = selectedCatalogBanco?.side === "cartao";
	const textPrimary = themeColors?.textPrimary;
	const textSecondary = themeColors?.textSecondary;
	const inputContainerStyle = {
		borderColor: themeColors?.borderStrong,
		backgroundColor: themeColors?.surface,
	};

	return (
		<Box
			className="w-full rounded-md border p-5"
			style={{
				backgroundColor: isDarkMode ? "#1C1C1E" : "#FFFFFF",
				borderColor: isDarkMode ? "rgba(255,255,255,0.10)" : "#E2E8F0",
			}}
		>
			<FormControl size="md">
				<FormControlLabel>
					<FormControlLabelText>Banco / Cartão (opcional)</FormControlLabelText>
				</FormControlLabel>

				<Pressable onPress={() => !disabled && setOpen(true)} disabled={disabled}>
					<Box
						className="w-full h-10 rounded border px-3 flex-row items-center justify-between"
						style={inputContainerStyle}
					>
						<HStack space="sm" className="items-center">
							{has ? (
								<BankLogo banco={selectedCatalogBanco} />
							) : (
								<Building2 size={18} color={textSecondary} />
							)}
							<Text style={{ color: has ? textPrimary : textSecondary }}>
								{has ? selectedCatalogBanco.nome : "Selecionar banco"}
							</Text>
							{isCartao ? (
								<HStack space="xs" className="items-center">
									<CreditCard size={13} color="#F59E0B" />
									<Text className="text-xs" style={{ color: "#F59E0B" }}>
										Cartão
									</Text>
								</HStack>
							) : null}
						</HStack>
						{has ? (
							<Pressable onPress={() => onSelect(null)} hitSlop={8} disabled={disabled}>
								<X size={16} color={textSecondary} />
							</Pressable>
						) : (
							<ChevronDown size={16} color={textPrimary} />
						)}
					</Box>
				</Pressable>
			</FormControl>

			<BancoSelectSheet
				isOpen={open}
				onClose={() => setOpen(false)}
				onSelect={(item) => {
					setOpen(false);
					onSelect(item);
				}}
				colors={themeColors}
				actionSheetContentStyle={actionSheetContentStyle}
				userId={userId}
				familyId={familyId}
			/>
		</Box>
	);
}
