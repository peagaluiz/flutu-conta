import { useState } from "react";
import { Pressable, View } from "react-native";
import { Check, ChevronDown } from "lucide-react-native";
import { Text } from "@/components/ui/text";

export const ALL_PAGE_SIZE = "todos";

function optionLabel(option) {
	return option === ALL_PAGE_SIZE ? "Tudo" : String(option);
}

// Seletor de itens por página da DataTable. O menu abre logo abaixo do gatilho,
// dentro da área da tabela (o container do pai recorta o que passar do limite).
export function PageSizeSelect({ value, options, colors, onChange }) {
	const [open, setOpen] = useState(false);

	return (
		<View style={{ position: "relative", zIndex: 10 }}>
			<Pressable
				onPress={() => setOpen((prev) => !prev)}
				style={({ hovered }) => ({
					flexDirection: "row",
					alignItems: "center",
					gap: 6,
					height: 30,
					paddingHorizontal: 10,
					borderRadius: 8,
					borderWidth: 1,
					borderColor: colors.border,
					backgroundColor: hovered ? colors.surfaceMuted : "transparent",
				})}
			>
				<Text className="text-xs font-medium" style={{ color: colors.textPrimary }}>
					{optionLabel(value)}
				</Text>
				<ChevronDown size={13} color={colors.textSecondary} />
			</Pressable>

			{open ? (
				<>
					<Pressable
						onPress={() => setOpen(false)}
						style={{
							position: "absolute",
							top: -1000,
							left: -2000,
							right: -2000,
							height: 4000,
						}}
					/>
					<View
						style={{
							position: "absolute",
							top: 34,
							right: 0,
							minWidth: 108,
							borderRadius: 8,
							borderWidth: 1,
							borderColor: colors.border,
							backgroundColor: colors.surface,
							paddingVertical: 4,
							zIndex: 20,
						}}
					>
						{options.map((option) => {
							const selected = option === value;
							return (
								<Pressable
									key={String(option)}
									onPress={() => {
										setOpen(false);
										onChange(option);
									}}
									style={({ hovered }) => ({
										flexDirection: "row",
										alignItems: "center",
										justifyContent: "space-between",
										gap: 8,
										paddingHorizontal: 10,
										paddingVertical: 7,
										backgroundColor: hovered ? colors.surfaceMuted : "transparent",
									})}
								>
									<Text
										className="text-xs"
										style={{ color: selected ? colors.textPrimary : colors.textSecondary }}
									>
										{optionLabel(option)}
									</Text>
									{selected ? <Check size={13} color={colors.brand} /> : null}
								</Pressable>
							);
						})}
					</View>
				</>
			) : null}
		</View>
	);
}

export default PageSizeSelect;
