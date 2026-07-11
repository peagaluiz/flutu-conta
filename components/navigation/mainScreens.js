import { Text } from "@/components/ui/text";

// Fonte única das telas do grupo (main), consumida pelos navegadores de tabs e drawer.
// `pushTo` intercepta o item e abre a rota no (stack) em vez de navegar no grupo.
export const MAIN_SCREENS = [
	{ name: "index", title: "Início", icon: "home" },
	{ name: "finance", title: "Financeiro", icon: "bar-chart" },
	{ name: "insert", icon: "add", pushTo: "/(auth)/(stack)/insert", drawerHidden: true },
	{ name: "launches", title: "Lançamentos", icon: "view-list" },
	{ name: "family", title: "Família", icon: "groups", pushTo: "/(auth)/(stack)/family" },
];

export function ScreenTitle({ title, colors }) {
	return (
		<Text size="2xl" style={{ color: colors.brand }}>
			{title}
		</Text>
	);
}
