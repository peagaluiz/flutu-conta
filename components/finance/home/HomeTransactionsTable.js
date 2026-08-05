import { View } from "react-native";
import { ChevronDown, ChevronUp, CreditCard } from "lucide-react-native";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Pressable } from "@/components/ui/pressable";
import { formatCurrency, formatDate } from "@/utils/finance/helpers";
import {
	FATURA_ICON_COLOR,
	FATURA_STATUS_LABEL,
	faturaGroupTitle,
} from "@/components/finance/home/FaturaGroupListItem";
import { cellStyle } from "@/utils/auth/launches/tableColumns";

// Variante em tabela (desktop web) da lista de lançamentos da home.

function HomeTableHeaderRow({ columns, colors }) {
	return (
		<HStack
			className="items-center"
			style={{ paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border }}
		>
			{columns.map((col) => (
				<View key={col.key} style={cellStyle(col)}>
					<Text
						className="text-[11px] font-semibold uppercase"
						numberOfLines={1}
						style={{
							color: colors.textSecondary,
							letterSpacing: 0.4,
							textAlign: col.align === "right" ? "right" : "left",
						}}
					>
						{col.label}
					</Text>
				</View>
			))}
			<View style={{ width: 24 }} />
		</HStack>
	);
}

function HomeTableDataRow({ item, columns, colors, onPress, indent = false }) {
	return (
		<Pressable onPress={onPress}>
			<HStack
				className="items-center"
				style={{
					paddingVertical: 9,
					paddingLeft: indent ? 20 : 0,
					borderBottomWidth: 1,
					borderBottomColor: colors.border,
				}}
			>
				{columns.map((col) => (
					<View key={col.key} style={cellStyle(col)}>
						{col.render(item, {}, col)}
					</View>
				))}
				<View style={{ width: 24 }} />
			</HStack>
		</Pressable>
	);
}

function faturaCellContent(col, group, colors) {
	switch (col.key) {
		case "tipo":
			return <CreditCard size={20} color={FATURA_ICON_COLOR} />;
		case "descricao":
			return (
				<Text
					className="text-sm font-semibold"
					numberOfLines={1}
					ellipsizeMode="tail"
					style={{ color: colors.textPrimary }}
				>
					{faturaGroupTitle(group)}
				</Text>
			);
		case "categoria":
			return (
				<Text className="text-xs" numberOfLines={1} style={{ color: colors.textSecondary }}>
					{group.items.length} lançamento{group.items.length > 1 ? "s" : ""}
				</Text>
			);
		case "data":
			return (
				<Text className="text-xs" numberOfLines={1} style={{ color: colors.textSecondary }}>
					{formatDate(group.data_vencimento)}
				</Text>
			);
		case "valor":
			return (
				<Text
					className="text-sm font-semibold"
					numberOfLines={1}
					style={{ color: colors.textPrimary, textAlign: "right" }}
				>
					{formatCurrency(group.valor)}
				</Text>
			);
		case "status":
			return (
				<Text className="text-xs" numberOfLines={1} style={{ color: colors.textSecondary }}>
					{FATURA_STATUS_LABEL[group.status] ?? group.status}
				</Text>
			);
		default:
			return null;
	}
}

function HomeFaturaTableRow({ group, columns, colors, expanded, onToggle, onPressItem }) {
	return (
		<>
			<Pressable onPress={onToggle}>
				<HStack
					className="items-center"
					style={{ paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.border }}
				>
					{columns.map((col) => (
						<View key={col.key} style={cellStyle(col)}>
							{faturaCellContent(col, group, colors)}
						</View>
					))}
					<View style={{ width: 24, alignItems: "center" }}>
						{expanded ? (
							<ChevronUp size={16} color={colors.textSecondary} />
						) : (
							<ChevronDown size={16} color={colors.textSecondary} />
						)}
					</View>
				</HStack>
			</Pressable>
			{expanded
				? group.items.map((child) => (
						<HomeTableDataRow
							key={String(child.id_transacao)}
							item={child}
							columns={columns}
							colors={colors}
							onPress={() => onPressItem(child)}
							indent
						/>
				  ))
				: null}
		</>
	);
}

export function HomeTransactionsTable({ items, columns, colors, previewLimit, expandedFaturas, toggleFatura, onPressItem }) {
	return (
		<Box>
			<HomeTableHeaderRow columns={columns} colors={colors} />
			{items.slice(0, previewLimit).map((item) =>
				item.is_fatura_group ? (
					<HomeFaturaTableRow
						key={String(item.id_transacao)}
						group={item}
						columns={columns}
						colors={colors}
						expanded={expandedFaturas.has(item.id_fatura)}
						onToggle={() => toggleFatura(item.id_fatura)}
						onPressItem={onPressItem}
					/>
				) : (
					<HomeTableDataRow
						key={String(item.id_transacao)}
						item={item}
						columns={columns}
						colors={colors}
						onPress={() => onPressItem(item)}
					/>
				)
			)}
		</Box>
	);
}
