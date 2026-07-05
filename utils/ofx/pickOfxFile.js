import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";

// Abre o seletor de arquivos, lê o .ofx escolhido e devolve { name, content } ou null se cancelado.
export async function pickOfxFile() {
	const res = await DocumentPicker.getDocumentAsync({
		type: ["application/x-ofx", "application/octet-stream", "text/plain", "*/*"],
		copyToCacheDirectory: true,
		multiple: false,
	});

	if (res.canceled) return null;
	const file = res.assets?.[0];
	if (!file?.uri) return null;

	const content = await FileSystem.readAsStringAsync(file.uri, {
		encoding: FileSystem.EncodingType.UTF8,
	});

	return { name: file.name ?? "extrato.ofx", content };
}
