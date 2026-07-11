import { Pressable, View } from "react-native";
import {
	ArrowDownCircle,
	ArrowUpCircle,
	CheckCircle,
	Pencil,
	RefreshCw,
	Trash2,
	XCircle,
} from "lucide-react-native";
import { Text } from "@/components/ui/text";
import { formatCurrency, formatDate } from "@/utils/finance/helpers";
import { getDescricao } from "@/utils/finance/getDescricao";
import { PrevistaBadge } from "@/components/finance/PrevistaBadge";

function descricaoDe(item) {
	return item.pessoa || getDescricao(item) || "Sem descrição";
}

function IconAction({ icon: Icon, onPress, colors }) {
	return (
		<Pressable
			onPress={onPress}
			hitSlop={4}
			style={({ hovered }) => ({
				width: 30,
				height: 30,
				borderRadius: 8,
				borderWidth: 1,
				borderColor: colors.border,
				backgroundColor: hovered ? colors.surfaceMuted : colors.surface,
				alignItems: "center",
				justifyContent: "center",
			})}
		>
			<Icon size={15} color={colors.textSecondary} />
		</Pressable>
	);
}

function ActionsCell({ children }) {
	return (
		<View style={{ flexDirection: "row", gap: 6, justifyContent: "flex-end" }}>
			{children}
		</View>
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

function MutedCell({ children, colors }) {
	return (
		<Text
			className="text-xs"
			numberOfLines={1}
			ellipsizeMode="tail"
			style={{ color: colors.textSecondary }}
		>
			{children}
		</Text>
	);
}

function PrimaryCell({ children, colors }) {
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

function transacoesWebColumns({ colors, onDarBaixa, onEdit, onDelete }) {
	return [
		{
			key: "data",
			label: "Data",
			width: 104,
			sortable: true,
			sortValue: (item) => item.data_vencimento || "",
			render: (item) => (
				<MutedCell colors={colors}>{formatDate(item.data_vencimento)}</MutedCell>
			),
		},
		{
			key: "descricao",
			label: "Descrição",
			flex: 3,
			sortable: true,
			sortValue: (item) => descricaoDe(item).toLowerCase(),
			render: (item) => (
				<View style={{ flexDirection: "row", alignItems: "center", gap: 8, minWidth: 0 }}>
					<PrimaryCell colors={colors}>{descricaoDe(item)}</PrimaryCell>
					{item.is_ghost ? <PrevistaBadge colors={colors} /> : null}
				</View>
			),
		},
		{
			key: "categoria",
			label: "Categoria",
			flex: 2,
			sortable: true,
			sortValue: (item) => String(item.categoria || "").toLowerCase(),
			render: (item) => (
				<MutedCell colors={colors}>{item.categoria || "Sem categoria"}</MutedCell>
			),
		},
		{
			key: "tipo",
			label: "Tipo",
			width: 118,
			sortable: true,
			sortValue: (item) => item.tipo,
			render: (item) => {
				const receber = item.tipo === "receber";
				const TipoIcon = receber ? ArrowUpCircle : ArrowDownCircle;
				const color = receber ? colors.success : colors.dangerText;
				return (
					<View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
						<TipoIcon size={15} color={color} />
						<Text className="text-xs font-medium" style={{ color }}>
							{receber ? "A receber" : "A pagar"}
						</Text>
					</View>
				);
			},
		},
		{
			key: "status",
			label: "Status",
			width: 104,
			sortable: true,
			sortValue: (item) => item.status,
			render: (item) => {
				const pago = item.status === "pago";
				return (
					<Pill
						label={pago ? "Pago" : "Pendente"}
						colors={colors}
						labelColor={pago ? colors.success : colors.textSecondary}
					/>
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
					style={{
						color: item.tipo === "receber" ? colors.success : colors.dangerText,
						textAlign: "right",
					}}
				>
					{formatCurrency(item.valor)}
				</Text>
			),
		},
		{
			key: "acoes",
			label: "Ações",
			width: 128,
			align: "right",
			// Previstas (fantasmas de recorrência) são display-only no web — editar/dar baixa
			// só no app. Mostra um traço no lugar das ações.
			render: (item) =>
				item.is_ghost ? (
					<Text
						className="text-xs"
						style={{ color: colors.textSecondary, textAlign: "right" }}
					>
						—
					</Text>
				) : (
					<ActionsCell>
						<IconAction
							icon={item.status === "pago" ? XCircle : CheckCircle}
							onPress={() => onDarBaixa(item)}
							colors={colors}
						/>
						<IconAction icon={Pencil} onPress={() => onEdit(item)} colors={colors} />
						<IconAction icon={Trash2} onPress={() => onDelete(item)} colors={colors} />
					</ActionsCell>
				),
		},
	];
}

function pessoasWebColumns({ colors, onEdit, onDelete, onSyncPessoa }) {
	return [
		{
			key: "id",
			label: "#",
			width: 64,
			sortable: true,
			sortValue: (item) => Number(item.id_pessoa || 0),
			render: (item) => (
				<MutedCell colors={colors}>
					{item.id_pessoa ? `#${item.id_pessoa}` : "—"}
				</MutedCell>
			),
		},
		{
			key: "nome",
			label: "Nome",
			flex: 3,
			sortable: true,
			sortValue: (item) => String(item.nome || "").toLowerCase(),
			render: (item) => <PrimaryCell colors={colors}>{item.nome || "Sem nome"}</PrimaryCell>,
		},
		{
			key: "status",
			label: "Status",
			flex: 2,
			render: (item) => {
				const pending = Number(item?.is_pending || 0) === 1;
				return (
					<MutedCell colors={colors}>
						{pending
							? `Pendente • ${Number(item.pending_count || 0)} lançamento(s)`
							: "Registro simples"}
					</MutedCell>
				);
			},
		},
		{
			key: "acoes",
			label: "Ações",
			width: 92,
			align: "right",
			render: (item) => {
				const pending = Number(item?.is_pending || 0) === 1;
				return (
					<ActionsCell>
						<IconAction icon={Pencil} onPress={() => onEdit(item)} colors={colors} />
						{pending ? (
							<IconAction
								icon={RefreshCw}
								onPress={() => onSyncPessoa(item)}
								colors={colors}
							/>
						) : (
							<IconAction icon={Trash2} onPress={() => onDelete(item)} colors={colors} />
						)}
					</ActionsCell>
				);
			},
		},
	];
}

function bancosWebColumns({ colors, onEdit, onDelete }) {
	const flags = (item) => {
		const legacyCartao = item.tipo === "cartao_credito";
		return {
			isCartao: item.is_cartao != null ? Number(item.is_cartao) === 1 : legacyCartao,
			isCorrente: item.is_corrente != null ? Number(item.is_corrente) === 1 : !legacyCartao,
		};
	};
	return [
		{
			key: "cor",
			label: "",
			width: 40,
			align: "center",
			render: (item) => (
				<View
					style={{
						width: 12,
						height: 12,
						borderRadius: 6,
						backgroundColor: item.cor_hex || colors.textSecondary,
					}}
				/>
			),
		},
		{
			key: "nome",
			label: "Nome",
			flex: 2,
			sortable: true,
			sortValue: (item) => String(item.nome || "").toLowerCase(),
			render: (item) => {
				const { isCartao, isCorrente } = flags(item);
				return (
					<View
						style={{ flexDirection: "row", alignItems: "center", gap: 8, minWidth: 0 }}
					>
						<PrimaryCell colors={colors}>{item.nome || "Sem nome"}</PrimaryCell>
						{isCorrente ? <Pill label="CONTA" colors={colors} /> : null}
						{isCartao ? <Pill label="CARTÃO" colors={colors} /> : null}
					</View>
				);
			},
		},
		{
			key: "info",
			label: "Detalhes",
			flex: 3,
			render: (item) => {
				const { isCartao, isCorrente } = flags(item);
				const subtitle =
					isCartao && item.dia_fechamento && item.dia_vencimento
						? `Fecha dia ${item.dia_fechamento} • Vence dia ${item.dia_vencimento}`
						: isCorrente && isCartao
						? "Conta corrente e cartão"
						: isCartao
						? "Cartão de crédito"
						: "Conta corrente";
				return <MutedCell colors={colors}>{subtitle}</MutedCell>;
			},
		},
		{
			key: "acoes",
			label: "Ações",
			width: 92,
			align: "right",
			render: (item) => (
				<ActionsCell>
					<IconAction icon={Pencil} onPress={() => onEdit(item)} colors={colors} />
					<IconAction icon={Trash2} onPress={() => onDelete(item)} colors={colors} />
				</ActionsCell>
			),
		},
	];
}

function imobilizadosWebColumns({ colors, onEdit, onDelete }) {
	return [
		{
			key: "descricao",
			label: "Descrição",
			flex: 3,
			sortable: true,
			sortValue: (item) => String(item.descricao || item.codigo || "").toLowerCase(),
			render: (item) => (
				<PrimaryCell colors={colors}>
					{item.descricao || item.codigo || "Sem nome"}
				</PrimaryCell>
			),
		},
		{
			key: "info",
			label: "Tipo",
			flex: 2,
			render: () => <MutedCell colors={colors}>Registro simples</MutedCell>,
		},
		{
			key: "acoes",
			label: "Ações",
			width: 92,
			align: "right",
			render: (item) => (
				<ActionsCell>
					<IconAction icon={Pencil} onPress={() => onEdit(item)} colors={colors} />
					<IconAction icon={Trash2} onPress={() => onDelete(item)} colors={colors} />
				</ActionsCell>
			),
		},
	];
}

export function getLaunchesWebColumns(section, handlers) {
	switch (section) {
		case "pessoas":
			return pessoasWebColumns(handlers);
		case "bancos":
			return bancosWebColumns(handlers);
		case "imobilizados":
			return imobilizadosWebColumns(handlers);
		case "transacoes":
		default:
			return transacoesWebColumns(handlers);
	}
}
