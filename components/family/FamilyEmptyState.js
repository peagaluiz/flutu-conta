import React from "react";
import { BarChart2, Shield, UserPlus, Users } from "lucide-react-native";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { Text } from "@/components/ui/text";
import { Button, ButtonIcon, ButtonText } from "@/components/ui/button";

const FEATURES = [
	{
		Icon: BarChart2,
		title: "Visão consolidada",
		desc: "Acompanhe receitas e despesas de todos os membros em um só lugar.",
	},
	{
		Icon: UserPlus,
		title: "Convide membros",
		desc: "Adicione familiares pelo e-mail e gerencie quem participa.",
	},
	{
		Icon: Shield,
		title: "Privacidade por padrão",
		desc: "Você escolhe quais lançamentos compartilhar com a família.",
	},
];

export function FamilyEmptyState({ colors, onCreatePress }) {
	return (
		<VStack className="gap-4">
			<Box className="items-center py-6">
				<Users size={56} color={colors.brand} />
				<Text
					className="mt-4 text-2xl font-bold text-center"
					style={{ color: colors.textPrimary }}
				>
					Finanças em família
				</Text>
				<Text
					className="mt-2 text-sm text-center"
					style={{ color: colors.textSecondary }}
				>
					Conecte sua conta com a de quem você confia e tenha uma visão financeira
					compartilhada.
				</Text>
			</Box>

			{FEATURES.map(({ Icon, title, desc }) => (
				<Box
					key={title}
					className="rounded-2xl border p-4 flex-row items-start gap-3"
					style={{ backgroundColor: colors.surface, borderColor: colors.border }}
				>
					<Box className="mt-0.5">
						<Icon size={22} color={colors.brand} />
					</Box>
					<VStack className="flex-1 gap-0.5">
						<Text className="font-semibold" style={{ color: colors.textPrimary }}>
							{title}
						</Text>
						<Text className="text-sm" style={{ color: colors.textSecondary }}>
							{desc}
						</Text>
					</VStack>
				</Box>
			))}

			<Button size="lg" action="primary" className="mt-2" onPress={onCreatePress}>
				<ButtonIcon as={Users} />
				<ButtonText>Criar minha família</ButtonText>
			</Button>
		</VStack>
	);
}
