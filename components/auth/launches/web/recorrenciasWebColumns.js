import { View } from "react-native";
import { Text } from "@/components/ui/text";
import { formatCurrency, formatDate } from "@/utils/finance/helpers";

function toFrequencyLabel(value) {
	if (value === "semanal") return "Semanal";
	if (value === "anual") return "Anual";
	if (value === "dias") return "Personalizada";
	return "Mensal";
}

function recorrenciaDescricao(item) {
	try {
		const parsed = JSON.parse(item.json || "{}");
		if (parsed?.descricao) return parsed.descricao;
	} catch {}
	return item.observacao || "";
}

function Muted({ children, colors, align }) {
	return (
		<Text
			className="text-xs"
			numberOfLines={1}
			ellipsizeMode="tail"
			style={{ color: colors.textSecondary, textAlign: align ?? "left" }}
		>
			{children}
		</Text>
	);
}

function Primary({ children, colors }) {
	return (
		<Text
			className="text-sm font-semibold"
			numberOfLines={1}
			ellipsizeMode="tail"
			style={{ color: colors.textPrimary, flexShrink: 1 }}
		>
			{children}
		</Text>
	);
}

function Pill({ label, colors, labelColor }) {
	return (
		<View
			style={{
				alignSelf: "flex-start",
				borderRadius: 999,
				paddingHorizontal: 8,
				paddingVertical: 3,
				borderWidth: 1,
				borderColor: colors.border,
				backgroundColor: colors.surfaceMuted,
			}}
		>
			<Text
				className="text-[11px] font-semibold"
				style={{ color: labelColor ?? colors.textSecondary }}
			>
				{label}
			</Text>
		</View>
	);
}

export function getRecorrenciasWebColumns(colors) {
	return [
		{
			key: "descricao",
			label: "Descrição",
			flex: 3,
			sortable: true,
			sortValue: (item) =>
				String(item.pessoa || recorrenciaDescricao(item) || "").toLowerCase(),
			render: (item) => (
				<Primary colors={colors}>
					{item.pessoa || recorrenciaDescricao(item) || "Sem descrição"}
				</Primary>
			),
		},
		{
			key: "frequencia",
			label: "Frequência",
			width: 130,
			sortable: true,
			sortValue: (item) => String(item.frequency || ""),
			render: (item) => (
				<Pill label={toFrequencyLabel(item.frequency)} colors={colors} labelColor={colors.brand} />
			),
		},
		{
			key: "categoria",
			label: "Categoria",
			flex: 2,
			sortable: true,
			sortValue: (item) => String(item.categoria || "").toLowerCase(),
			render: (item) => <Muted colors={colors}>{item.categoria || "Sem categoria"}</Muted>,
		},
		{
			key: "proxima",
			label: "Próxima geração",
			width: 150,
			sortable: true,
			sortValue: (item) => String(item.next_due_date || item.base_due_date || ""),
			render: (item) => (
				<Muted colors={colors}>{formatDate(item.next_due_date || item.base_due_date)}</Muted>
			),
		},
		{
			key: "status",
			label: "Status",
			width: 160,
			render: (item) => {
				const active = item.status === "ativa";
				return (
					<View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
						<Pill
							label={active ? "Ativa" : "Pausada"}
							colors={colors}
							labelColor={active ? colors.success : colors.textSecondary}
						/>
						<Muted colors={colors}>
							{Number(item.active_transactions_count || 0)} lanç.
						</Muted>
					</View>
				);
			},
		},
		{
			key: "valor",
			label: "Valor",
			width: 124,
			align: "right",
			sortable: true,
			sortValue: (item) => Number(item.valor || 0),
			render: (item) => (
				<Text
					className="text-sm font-semibold"
					style={{ color: colors.textPrimary, textAlign: "right" }}
				>
					{formatCurrency(item.valor)}
				</Text>
			),
		},
	];
}
