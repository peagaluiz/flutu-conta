import { useCallback, useRef } from "react";
import { DatePickerModalContent } from "react-native-paper-dates";
import { Modal, ModalBackdrop, ModalContent } from "@/components/ui/modal";
import { useTheme } from "@/components/ui/gluestack-ui-provider/ThemeProvider/ThemeProvider";
import { getThemeColors } from "@/constants/colors";

// Na web, o Modal do react-native cria um portal com focus trap próprio que
// briga com o FocusScope do modal gluestack aberto por baixo (o picker pisca
// e perde o foco). Usar o overlay do gluestack mantém tudo no mesmo sistema
// de foco/empilhamento.
export function DatePickerDialog({ visible, onDismiss, ...contentProps }) {
	const { theme } = useTheme();
	const colors = getThemeColors(theme);

	const onConfirmRef = useRef(contentProps.onConfirm);
	onConfirmRef.current = contentProps.onConfirm;

	const handleChange = useCallback(
		(params) => {
			if (contentProps.mode === "single" && params.date) {
				onDismiss();
				requestAnimationFrame(() => {
					onConfirmRef.current?.(params);
				});
			} else {
				contentProps.onChange?.(params);
			}
		},
		[contentProps.mode, contentProps.onChange, onDismiss]
	);

	return (
		<Modal isOpen={visible} onClose={onDismiss}>
			<ModalBackdrop />
			<ModalContent
				className="p-0 w-[90%] max-w-[400px] h-[600px] overflow-hidden"
				style={{ backgroundColor: colors.surface }}
			>
				<DatePickerModalContent
					{...contentProps}
					onChange={handleChange}
					onDismiss={onDismiss}
					disableStatusBar
					disableSafeTop
				/>
			</ModalContent>
		</Modal>
	);
}
