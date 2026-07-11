import { getItemType } from "@/utils/auth/launches/sections";
import LaunchesTableRow from "./table/LaunchesTableRow";
import TransacaoCard from "./TransacaoCard";
import PessoaCard from "./PessoaCard";
import ImobilizadoCard from "./ImobilizadoCard";
import RecorrenciaCard from "./RecorrenciaCard";
import BancoCard from "./BancoCard";

export default function LaunchesListItem({
	item,
	section,
	columns,
	colors,
	isDesktopWeb,
	selected,
	selectionMode,
	isHighlighted,
	onEdit,
	onDelete,
	onDarBaixa,
	onSyncPessoa,
	onToggleRecorrenciaStatus,
	onDeleteRecorrenciaScope,
	onLongPress,
	onToggleSelect,
}) {
	const itemType = getItemType(item);
	const handleSync = () =>
		Number(item?.is_pending || 0) === 1 ? onSyncPessoa(item) : null;

	if (isDesktopWeb) {
		return (
			<LaunchesTableRow
				item={item}
				section={section}
				columns={columns}
				colors={colors}
				selected={selected}
				selectionMode={selectionMode}
				isHighlighted={isHighlighted}
				handlers={{
					onEdit: () => onEdit(item),
					onDelete: () => onDelete(item),
					onDarBaixa: () => onDarBaixa(item),
					onSync: handleSync,
					onToggleSelect: () => onToggleSelect(item),
					onLongPress: () => onLongPress(item),
				}}
			/>
		);
	}

	if (itemType === "transacoes") {
		return (
			<TransacaoCard
				item={item}
				colors={colors}
				onEdit={() => onEdit(item)}
				onDelete={() => onDelete(item)}
				onDarBaixa={() => onDarBaixa(item)}
				selected={selected}
				selectionMode={selectionMode}
				onLongPress={() => onLongPress(item)}
				onToggleSelect={() => onToggleSelect(item)}
				isHighlighted={isHighlighted}
			/>
		);
	}
	if (itemType === "pessoas") {
		return (
			<PessoaCard
				item={item}
				colors={colors}
				onEdit={() => onEdit(item)}
				onDelete={() => onDelete(item)}
				onSync={handleSync}
			/>
		);
	}
	if (itemType === "imobilizados") {
		return (
			<ImobilizadoCard
				item={item}
				colors={colors}
				onEdit={() => onEdit(item)}
				onDelete={() => onDelete(item)}
			/>
		);
	}
	if (itemType === "recorrencias") {
		return (
			<RecorrenciaCard
				item={item}
				colors={colors}
				onToggleStatus={() => onToggleRecorrenciaStatus(item)}
				onDelete={(withTransacoes) => onDeleteRecorrenciaScope(item, withTransacoes)}
			/>
		);
	}
	if (itemType === "bancos") {
		return (
			<BancoCard
				item={item}
				colors={colors}
				onEdit={() => onEdit(item)}
				onDelete={() => onDelete(item)}
			/>
		);
	}
	return null;
}
