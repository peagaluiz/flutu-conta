import { Upload, Users, Repeat } from "lucide-react-native";
import { useRouter } from "expo-router";
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { Pressable } from "@/components/ui/pressable";
import { LAUNCHES_PATH } from "@/utils/navigation";
import { DesktopCard } from "./DesktopCard";

const SHORTCUTS = [
	{
		key: "ofx",
		title: "Importar OFX",
		subtitle: "Traga seu extrato do banco",
		icon: Upload,
		color: "#2d3849",
		href: "/(auth)/(stack)/ofx-import",
	},
	{
		key: "family",
		title: "Família",
		subtitle: "Convide e compartilhe",
		icon: Users,
		color: "#192230",
		href: "/(auth)/(stack)/family",
	},
	{
		key: "recorrencias",
		title: "Recorrências",
		subtitle: "Contas fixas do mês",
		icon: Repeat,
		color: "#0c665e",
		href: LAUNCHES_PATH,
	},
];

function ShortcutTile({ item, onPress }) {
	const Icon = item.icon;
	return (
		<Pressable onPress={onPress} className="flex-1">
			<Box
				className="h-full flex-row items-center gap-3 rounded-xl px-4 py-3"
				style={{ backgroundColor: item.color }}
			>
				<Box className="rounded-lg p-2" style={{ backgroundColor: "rgba(255,255,255,0.12)" }}>
					<Icon size={18} color="#FFFFFF" />
				</Box>
				<Box className="flex-1">
					<Text className="font-semibold" style={{ color: "#FFFFFF" }}>
						{item.title}
					</Text>
					<Text className="text-xs" style={{ color: "rgba(255,255,255,0.7)" }}>
						{item.subtitle}
					</Text>
				</Box>
			</Box>
		</Pressable>
	);
}

export function QuickShortcutsCard({ height }) {
	const router = useRouter();
	return (
		<DesktopCard
			title="Atalhos rápidos"
			style={{ minHeight: 306, height: height || undefined, boxSizing: "border-box" }}
			contentClassName={height ? "gap-4 flex-1" : "gap-2.5"}
		>
			{SHORTCUTS.map((item) => (
				<ShortcutTile key={item.key} item={item} onPress={() => router.push(item.href)} />
			))}
		</DesktopCard>
	);
}
