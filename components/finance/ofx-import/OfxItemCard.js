import { CheckSquare, Square, Tag, UserRound } from "lucide-react-native";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { Text } from "@/components/ui/text";
import { Pressable } from "@/components/ui/pressable";
import { Input, InputField } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/search-select";
import { formatCurrency, formatDate } from "@/utils/finance/helpers";

export function OfxItemCard({
	item,
	categoryName,
	pessoaOptions,
	colors,
	isDarkMode,
	onToggle,
	onChangeField,
	onOpenCategoria,
}) {
	const isPagar = Number(item.amount) < 0;
	const accent = isPagar ? "#DC2626" : "#16A34A";
	const inputContainerStyle = { borderColor: colors.borderStrong, backgroundColor: colors.surface };

	return (
		<Box
			className="rounded-xl border overflow-hidden"
			style={{
				backgroundColor: colors.surface,
				borderColor: item.checked ? colors.borderStrong : colors.border,
				opacity: item.checked ? 1 : 0.5,
			}}
		>
			{/* Cabeçalho: seleção + data/badges + valor */}
			<HStack
				className="items-center gap-3 px-3 py-2"
				style={{ borderLeftWidth: 3, borderLeftColor: accent, backgroundColor: colors.surfaceMuted }}
			>
				<Pressable onPress={onToggle} hitSlop={8}>
					{item.checked ? (
						<CheckSquare size={22} color={colors.success ?? "#16A34A"} />
					) : (
						<Square size={22} color={colors.textSecondary} />
					)}
				</Pressable>
				<HStack className="items-center gap-2 flex-1 flex-wrap">
					<Text className="text-xs" style={{ color: colors.textSecondary }}>
						{formatDate(item.date)}
					</Text>
					{item.parcelaTotal ? (
						<Box className="rounded-full px-2 py-0.5" style={{ backgroundColor: colors.surface }}>
							<Text className="text-[10px] font-semibold" style={{ color: colors.textSecondary }}>
								{item.parcelaAtual}/{item.parcelaTotal}
							</Text>
						</Box>
					) : null}
					{item.duplicate ? (
						<Text className="text-[11px] font-semibold" style={{ color: "#F59E0B" }}>
							Duplicado
						</Text>
					) : item.matched ? (
						<Text className="text-[11px] font-semibold" style={{ color: "#F59E0B" }}>
							Já lançado
						</Text>
					) : null}
				</HStack>
				<Text className="text-base font-bold" style={{ color: accent }}>
					{formatCurrency(Math.abs(Number(item.amount || 0)))}
				</Text>
			</HStack>

			{/* Corpo: descrição / pessoa / categoria */}
			<VStack className="gap-2 px-3 py-2.5">
				<VStack className="gap-1">
					<Text className="text-[11px] font-medium" style={{ color: colors.textSecondary }}>
						Descrição
					</Text>
					<Input variant="outline" size="sm" style={inputContainerStyle}>
						<InputField
							value={item.descricao}
							onChangeText={(t) => onChangeField("descricao", t)}
							placeholder="Descrição"
							style={{ color: colors.textPrimary }}
						/>
					</Input>
				</VStack>

				<SearchableSelect
					label="Pessoa"
					value={item.pessoa}
					onChange={(v) => onChangeField("pessoa", v)}
					options={pessoaOptions}
					placeholder="Selecionar pessoa"
					searchPlaceholder="Pesquisar pessoa..."
					Icon={UserRound}
					inputContainerStyle={inputContainerStyle}
					themeColors={colors}
					isDarkMode={isDarkMode}
					autoFocusSearch
					fixedHeight={false}
					allowCreateOption
					getCreateLabel={(v) => `Criar pessoa "${v}"`}
				/>

				<Pressable onPress={onOpenCategoria}>
					<HStack
						className="items-center gap-1.5 rounded-lg border px-3 py-2 self-start"
						style={{ borderColor: colors.border }}
					>
						<Tag size={14} color={colors.textSecondary} />
						<Text
							className="text-xs"
							style={{ color: categoryName ? colors.textPrimary : colors.textSecondary }}
						>
							{categoryName || "Categoria"}
						</Text>
					</HStack>
				</Pressable>
			</VStack>
		</Box>
	);
}
