import {
	ArrowDownCircle,
	ArrowUpCircle,
	CheckCircle2,
	Circle,
	CircleAlert,
} from "lucide-react-native";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { formatCurrency, formatDate, isRecebimentoVencido } from "@/utils/finance/helpers";
import { getDescricao } from "@/utils/finance/getDescricao";
import { PrevistaBadge } from "@/components/finance/PrevistaBadge";

// Estilo de célula compartilhado entre header e linha — garante alinhamento
// coluna-a-coluna (mesmo width/flex).
export function cellStyle(col) {
	return {
		...(col.width != null ? { width: col.width } : { flex: col.flex ?? 1, minWidth: 0 }),
		paddingHorizontal: 6,
		justifyContent: "center",
		alignItems: col.align === "center" ? "center" : "stretch",
	};
}

function textAlignOf(col) {
	return col.align === "right" ? "right" : "left";
}

function MutedText({ children, col, colors }) {
	return (
		<Text
			className="text-xs"
			numberOfLines={1}
			ellipsizeMode="tail"
			style={{ color: colors.textSecondary, textAlign: textAlignOf(col) }}
		>
			{children}
		</Text>
	);
}

function PrimaryText({ children, col, colors, bold }) {
	return (
		<Text
			className={bold ? "text-sm font-semibold" : "text-sm"}
			numberOfLines={1}
			ellipsizeMode="tail"
			style={{ color: colors.textPrimary, textAlign: textAlignOf(col) }}
		>
			{children}
		</Text>
	);
}

function StatusBadge({ label, colors }) {
	return (
		<Box className="rounded-full px-2 py-0.5" style={{ backgroundColor: colors.surfaceMuted }}>
			<Text className="text-[10px] font-semibold" style={{ color: colors.textSecondary }}>
				{label}
			</Text>
		</Box>
	);
}

function transacoesColumns(colors) {
	return [
		{
			key: "tipo",
			label: "",
			width: 40,
			align: "center",
			render: (item, ctx) => {
				if (ctx?.selectionMode) {
					return ctx.selected ? (
						<CheckCircle2 size={18} color={colors.brand} />
					) : (
						<Circle size={18} color={colors.textSecondary} />
					);
				}
				if (isRecebimentoVencido(item)) return <CircleAlert size={20} color={colors.textPrimary} />;
				return item.tipo === "receber" ? (
					<ArrowUpCircle size={20} color={colors.textPrimary} />
				) : (
					<ArrowDownCircle size={20} color={colors.textPrimary} />
				);
			},
		},
		{
			key: "descricao",
			label: "Descrição",
			flex: 3,
			render: (item, _ctx, col) => (
				<PrimaryText col={col} colors={colors} bold>
					{item.pessoa || getDescricao(item) || "Sem pessoa"}
				</PrimaryText>
			),
		},
		{
			key: "categoria",
			label: "Categoria",
			flex: 2,
			render: (item, _ctx, col) => (
				<MutedText col={col} colors={colors}>
					{item.categoria || "Sem categoria"}
				</MutedText>
			),
		},
		{
			key: "data",
			label: "Vencimento",
			width: 104,
			render: (item, _ctx, col) => (
				<MutedText col={col} colors={colors}>
					{formatDate(item.data_vencimento)}
				</MutedText>
			),
		},
		{
			key: "valor",
			label: "Valor",
			width: 120,
			align: "right",
			render: (item, _ctx, col) => (
				<PrimaryText col={col} colors={colors} bold>
					{formatCurrency(item.valor)}
				</PrimaryText>
			),
		},
		{
			key: "status",
			label: "Status",
			width: 96,
			render: (item, _ctx, col) =>
				item.is_ghost ? (
					<HStack style={{ justifyContent: "flex-start" }}>
						<PrevistaBadge colors={colors} />
					</HStack>
				) : (
					<MutedText col={col} colors={colors}>
						{item.status === "pago" ? "Pago" : "Pendente"}
					</MutedText>
				),
		},
	];
}

function pessoasColumns(colors) {
	return [
		{
			key: "id",
			label: "#",
			width: 56,
			render: (item, _ctx, col) => (
				<MutedText col={col} colors={colors}>
					{item.id_pessoa ? `#${item.id_pessoa}` : "—"}
				</MutedText>
			),
		},
		{
			key: "nome",
			label: "Nome",
			flex: 3,
			render: (item, _ctx, col) => (
				<PrimaryText col={col} colors={colors} bold>
					{item.nome || "Sem nome"}
				</PrimaryText>
			),
		},
		{
			key: "status",
			label: "Status",
			flex: 2,
			render: (item, _ctx, col) => {
				const pending = Number(item?.is_pending || 0) === 1;
				return (
					<MutedText col={col} colors={colors}>
						{pending
							? `Pendente • ${Number(item.pending_count || 0)} lançamento(s)`
							: "Registro simples"}
					</MutedText>
				);
			},
		},
	];
}

function imobilizadosColumns(colors) {
	return [
		{
			key: "descricao",
			label: "Descrição",
			flex: 3,
			render: (item, _ctx, col) => (
				<PrimaryText col={col} colors={colors} bold>
					{item.descricao || item.codigo || "Sem nome"}
				</PrimaryText>
			),
		},
		{
			key: "info",
			label: "Tipo",
			flex: 2,
			render: (_item, _ctx, col) => (
				<MutedText col={col} colors={colors}>
					Registro simples
				</MutedText>
			),
		},
	];
}

function bancosColumns(colors) {
	return [
		{
			key: "cor",
			label: "",
			width: 32,
			align: "center",
			render: (item) => (
				<Box
					className="rounded-full"
					style={{ width: 12, height: 12, backgroundColor: item.cor_hex || "#6B7280" }}
				/>
			),
		},
		{
			key: "nome",
			label: "Nome",
			flex: 2,
			render: (item, _ctx, col) => {
				const legacyCartao = item.tipo === "cartao_credito";
				const isCartao = item.is_cartao != null ? Number(item.is_cartao) === 1 : legacyCartao;
				const isCorrente = item.is_corrente != null ? Number(item.is_corrente) === 1 : !legacyCartao;
				return (
					<HStack className="items-center gap-2">
						<PrimaryText col={col} colors={colors} bold>
							{item.nome || "Sem nome"}
						</PrimaryText>
						{isCorrente ? <StatusBadge label="CONTA" colors={colors} /> : null}
						{isCartao ? <StatusBadge label="CARTÃO" colors={colors} /> : null}
					</HStack>
				);
			},
		},
		{
			key: "info",
			label: "Detalhes",
			flex: 3,
			render: (item, _ctx, col) => {
				const legacyCartao = item.tipo === "cartao_credito";
				const isCartao = item.is_cartao != null ? Number(item.is_cartao) === 1 : legacyCartao;
				const isCorrente = item.is_corrente != null ? Number(item.is_corrente) === 1 : !legacyCartao;
				const subtitle =
					isCartao && item.dia_fechamento && item.dia_vencimento
						? `Fecha dia ${item.dia_fechamento} • Vence dia ${item.dia_vencimento}`
						: isCorrente && isCartao
						? "Conta corrente e cartão"
						: isCartao
						? "Cartão de crédito"
						: "Conta corrente";
				return (
					<MutedText col={col} colors={colors}>
						{subtitle}
					</MutedText>
				);
			},
		},
	];
}

export function getTableColumns(section, colors) {
	switch (section) {
		case "pessoas":
			return pessoasColumns(colors);
		case "imobilizados":
			return imobilizadosColumns(colors);
		case "bancos":
			return bancosColumns(colors);
		case "transacoes":
		default:
			return transacoesColumns(colors);
	}
}

// Largura fixa da coluna de ações (varia com a quantidade de botões).
export function getActionsWidth(section) {
	switch (section) {
		case "transacoes":
			return 220;
		default:
			return 190;
	}
}
