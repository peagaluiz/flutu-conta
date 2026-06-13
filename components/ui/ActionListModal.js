import { Modal, ModalBackdrop, ModalContent, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";
import { Button, ButtonText } from "@/components/ui/button";
import { VStack } from "@/components/ui/vstack";
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { Pressable } from "@/components/ui/pressable";
import { useTheme } from "@/components/ui/gluestack-ui-provider/ThemeProvider/ThemeProvider";
import { getThemeColors } from "@/constants/colors";

// Each item is either:
//   { label, icon?, color?, onPress }  — rendered as Pressable > Box
//   { render: (colors) => ReactNode }  — custom slot

export function ActionListModal({
	isOpen,
	onClose,
	title,
	items = [],
	cancelLabel = "Fechar",
	size = "md",
}) {
	const { theme } = useTheme();
	const colors = getThemeColors(theme);

	return (
		<Modal isOpen={isOpen} onClose={onClose} size={size}>
			<ModalBackdrop />
			<ModalContent style={{ backgroundColor: colors.surface }}>
				{title ? (
					<ModalHeader>
						<Text className="text-base font-semibold" style={{ color: colors.textPrimary }}>
							{title}
						</Text>
					</ModalHeader>
				) : null}
				<ModalBody>
					<VStack space="sm">
						{items.map((item, index) => {
							if (item.render) {
								return <Box key={index}>{item.render(colors)}</Box>;
							}
							const Icon = item.icon;
							const color = item.color ?? colors.textPrimary;
							return (
								<Pressable key={index} onPress={item.onPress}>
									<Box
										className="rounded-xl px-4 py-3 border flex-row items-center gap-3"
										style={{ backgroundColor: colors.surfaceMuted, borderColor: colors.border }}
									>
										{Icon ? <Icon size={20} color={color} /> : null}
										<Text className="text-sm font-medium" style={{ color }}>
											{item.label}
										</Text>
									</Box>
								</Pressable>
							);
						})}
					</VStack>
				</ModalBody>
				<ModalFooter className="justify-end">
					<Button variant="outline" onPress={onClose}>
						<ButtonText>{cancelLabel}</ButtonText>
					</Button>
				</ModalFooter>
			</ModalContent>
		</Modal>
	);
}
