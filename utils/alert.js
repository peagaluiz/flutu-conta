import { Alert as NativeAlert, Platform } from "react-native";

// Alert.alert é no-op no react-native-web; na web usamos confirm/alert nativos do navegador.
// Limitação web: diálogos com 3+ botões viram confirmar/cancelar (primeiro botão não-cancel confirma).
function webAlert(title, message, buttons) {
	const text = [title, message].filter(Boolean).join("\n\n");

	if (!buttons?.length) {
		window.alert(text);
		return;
	}

	const confirmButton = buttons.find((b) => b?.style !== "cancel");
	const cancelButton = buttons.find((b) => b?.style === "cancel");

	if (buttons.length === 1) {
		window.alert(text);
		buttons[0]?.onPress?.();
		return;
	}

	if (window.confirm(text)) {
		confirmButton?.onPress?.();
	} else {
		cancelButton?.onPress?.();
	}
}

export const Alert = {
	alert: (title, message, buttons, options) =>
		Platform.OS === "web"
			? webAlert(title, message, buttons)
			: NativeAlert.alert(title, message, buttons, options),
};
