import { View } from "react-native";
import { Text } from "@/components/ui/text";

function DetailBlock({ label, text, colors }) {
	return (
		<View>
			<Text
				className="text-[11px] font-semibold uppercase"
				style={{ color: colors.textSecondary, letterSpacing: 0.4 }}
			>
				{label}
			</Text>
			<Text className="text-sm mt-1" style={{ color: colors.textPrimary }}>
				{text}
			</Text>
		</View>
	);
}

// Conteúdo da linha expandida da tabela de lançamentos: descrição e observação
// como blocos independentes. Sem nenhum dos dois a linha nem chega a abrir
// (ver hasDetalhes no LaunchesWebScreen).
export function ExpandedDetails({ descricao, observacao, colors }) {
	if (!descricao && !observacao) return null;
	return (
		<View
			style={{
				borderRadius: 8,
				borderWidth: 1,
				borderColor: colors.border,
				backgroundColor: colors.surface,
				paddingHorizontal: 12,
				paddingVertical: 10,
			}}
		>
			{descricao ? <DetailBlock label="Descrição" text={descricao} colors={colors} /> : null}
			{descricao && observacao ? (
				<View
					style={{ height: 1, backgroundColor: colors.border, marginVertical: 10 }}
				/>
			) : null}
			{observacao ? <DetailBlock label="Observação" text={observacao} colors={colors} /> : null}
		</View>
	);
}
