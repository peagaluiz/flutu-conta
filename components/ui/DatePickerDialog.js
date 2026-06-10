import { useCallback, useRef } from "react";
import { Modal, TouchableWithoutFeedback, View } from "react-native";
import { DatePickerModalContent } from "react-native-paper-dates";
import { useTheme } from "@/components/ui/gluestack-ui-provider/ThemeProvider/ThemeProvider";
import { getThemeColors } from "@/constants/colors";

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

	if (!visible) return null;

	return (
		<Modal
			transparent
			visible={visible}
			animationType="fade"
			onRequestClose={onDismiss}
			statusBarTranslucent
		>
			<TouchableWithoutFeedback onPress={onDismiss}>
				<View className="absolute inset-0 bg-black/50" />
			</TouchableWithoutFeedback>

			<View className="absolute inset-0 justify-center items-center" pointerEvents="box-none">
				<View
					className="w-[90%] max-w-[400px] h-[600px] rounded-xl overflow-hidden"
					style={{
						backgroundColor: colors.surface,
						elevation: 8,
						shadowColor: "#000",
						shadowOffset: { width: 0, height: 4 },
						shadowOpacity: 0.25,
						shadowRadius: 10,
					}}
				>
					<DatePickerModalContent
						{...contentProps}
						onChange={handleChange}
						onDismiss={onDismiss}
						disableStatusBar
						disableSafeTop
					/>
				</View>
			</View>
		</Modal>
	);
}

