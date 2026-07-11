import { Platform } from "react-native";
import { Users, Package, Wallet, Repeat, Landmark } from "lucide-react-native";

export const SECTIONS = {
	transacoes: {
		key: "transacoes",
		label: "Transações",
		title: "Transações",
		icon: Wallet,
		idKey: "id_transacao",
	},
	pessoas: {
		key: "pessoas",
		label: "Pessoas",
		title: "Pessoas",
		icon: Users,
		idKey: "id_pessoa",
	},
	imobilizados: {
		key: "imobilizados",
		label: "Imobilizados",
		title: "Imobilizados",
		icon: Package,
		idKey: "id_imobilizado",
	},
	recorrencias: {
		key: "recorrencias",
		label: "Recorrentes",
		title: "Recorrências",
		icon: Repeat,
		idKey: "id_recurrencia",
	},
	bancos: {
		key: "bancos",
		label: "Bancos",
		title: "Bancos",
		icon: Landmark,
		idKey: "id_banco",
	},
};

// Recorrências rodam apenas sobre o banco local; na web a seção fica oculta
export const BLOCKS = Object.values(SECTIONS).filter(
	(section) => Platform.OS !== "web" || section.key !== "recorrencias"
);

export function getSectionConfig(section) {
	return SECTIONS[section] ?? SECTIONS.transacoes;
}

export function getItemType(item) {
	if (!item) return null;
	if (item.id_transacao != null) return "transacoes";
	if (item.id_pessoa != null) return "pessoas";
	if (item.id_imobilizado != null) return "imobilizados";
	if (item.id_recurrencia != null) return "recorrencias";
	if (item._type === "banco" || (item.id_banco != null && item.cor_hex != null && item.id_transacao == null)) return "bancos";
	return null;
}

export function getItemId(item) {
	const type = getItemType(item);

	if (type === "transacoes") {
		return item.id_transacao ?? item.remote_id;
	}

	if (type === "pessoas") {
		return item.id_pessoa;
	}

	if (type === "imobilizados") {
		return item.id_imobilizado;
	}

	if (type === "recorrencias") {
		return item.id_recurrencia;
	}

	return null;
}

export function normalizeTransacoes(rows) {
	return (Array.isArray(rows) ? rows : []).map((item, index) => ({
		...item,
		id_transacao: item?.id_transacao ?? item?.remote_id ?? index + 1,
	}));
}
