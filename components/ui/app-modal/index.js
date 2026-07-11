import { View } from "react-native";
import { X } from "lucide-react-native";
import { Modal, ModalBackdrop, ModalContent } from "@/components/ui/modal";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { HStack } from "@/components/ui/hstack";
import { useTheme } from "@/components/ui/gluestack-ui-provider/ThemeProvider/ThemeProvider";
import { getThemeColors } from "@/constants/colors";

// Template de modal do desktop web (padrão do inserir/editar): casca de largura
// fixa, fundo elevado no dark, e a root vira o container de scroll (estilo
// Bootstrap) pra o modal crescer com o conteúdo. O header fica como peça
// separada (AppModalHeader) porque o título costuma ser dinâmico e vem do
// conteúdo. Reexporta as cores resolvidas via render prop pra reuso.
export function AppModal({ isOpen, onClose, children, width = "96vw", contentClassName = "" }) {
	const { theme } = useTheme();
	const isDarkMode = theme === "dark";
	const baseColors = getThemeColors(theme);
	// No dark, o fundo usa um cinza elevado em vez do quase-preto do screen; o
	// mesmo valor vai pra `colors.screen` pra os filhos ficarem consistentes.
	const colors = isDarkMode ? { ...baseColors, screen: "#232326" } : baseColors;

	return (
		<Modal
			isOpen={isOpen}
			onClose={onClose}
			size="full"
			avoidKeyboard
			className="justify-start items-center overflow-y-auto py-6"
		>
			<ModalBackdrop className="fixed" />
			<ModalContent
				className={`p-0 my-auto ${contentClassName}`.trim()}
				style={{ width, backgroundColor: colors.screen }}
			>
				{typeof children === "function" ? children({ colors, isDarkMode }) : children}
			</ModalContent>
		</Modal>
	);
}

// Barra de 56px: título à esquerda, botão X à direita.
export function AppModalHeader({ title, onClose, disabled = false, colors }) {
	return (
		<HStack
			className="items-center justify-between px-4"
			style={{ height: 56, borderBottomWidth: 1, borderBottomColor: colors.border }}
		>
			<Text size="lg" style={{ color: colors.textPrimary, fontWeight: "600" }}>
				{title}
			</Text>
			<Pressable
				onPress={onClose}
				disabled={disabled}
				style={{
					width: 32,
					height: 32,
					borderRadius: 8,
					alignItems: "center",
					justifyContent: "center",
				}}
				accessibilityLabel="Fechar"
			>
				<X size={20} color={colors.textSecondary} />
			</Pressable>
		</HStack>
	);
}
