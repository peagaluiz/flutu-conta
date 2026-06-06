import { useCallback, useRef } from "react";
import { Modal, StyleSheet, TouchableWithoutFeedback, View } from "react-native";
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
		// eslint-disable-next-line react-hooks/exhaustive-deps
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
				<View style={styles.backdrop} />
			</TouchableWithoutFeedback>

			<View style={styles.center} pointerEvents="box-none">
				<View style={[styles.dialog, { backgroundColor: colors.surface }]}>
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

const styles = StyleSheet.create({
	backdrop: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: "rgba(0,0,0,0.5)",
	},
	center: {
		...StyleSheet.absoluteFillObject,
		justifyContent: "center",
		alignItems: "center",
	},
	dialog: {
		width: "90%",
		maxWidth: 400,
		height: 600,
		borderRadius: 12,
		overflow: "hidden",
		elevation: 8,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.25,
		shadowRadius: 10,
	},
});
