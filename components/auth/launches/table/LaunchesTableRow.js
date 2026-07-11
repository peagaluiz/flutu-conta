import React, { memo, useRef, useEffect, useCallback } from "react";
import { View, Pressable, Animated, Easing } from "react-native";
import { HStack } from "@/components/ui/hstack";
import ActionButton from "@/components/auth/launches/ActionButton";
import { CheckCircle, Pencil, RefreshCw, Trash2 } from "lucide-react-native";
import { cellStyle, getActionsWidth } from "@/utils/auth/launches/tableColumns";

function RowActions({ section, item, colors, handlers }) {
	if (section === "transacoes") {
		return (
			<HStack className="gap-2 items-center" style={{ width: "100%" }}>
				<ActionButton
					label={item.status === "pendente" ? "Dar Baixa" : "Remover baixa"}
					icon={CheckCircle}
					onPress={handlers.onDarBaixa}
					colors={colors}
				/>
				<ActionButton icon={Pencil} onPress={handlers.onEdit} colors={colors} className="flex-none" />
				<ActionButton icon={Trash2} onPress={handlers.onDelete} colors={colors} className="flex-none" />
			</HStack>
		);
	}
	if (section === "pessoas") {
		const pending = Number(item?.is_pending || 0) === 1;
		return (
			<HStack className="gap-2 items-center" style={{ width: "100%" }}>
				<ActionButton label="Editar" icon={Pencil} onPress={handlers.onEdit} colors={colors} />
				{pending ? (
					<ActionButton label="Sincronizar" icon={RefreshCw} onPress={handlers.onSync} colors={colors} />
				) : (
					<ActionButton label="Excluir" icon={Trash2} onPress={handlers.onDelete} colors={colors} />
				)}
			</HStack>
		);
	}
	// imobilizados, bancos
	return (
		<HStack className="gap-2 items-center" style={{ width: "100%" }}>
			<ActionButton label="Editar" icon={Pencil} onPress={handlers.onEdit} colors={colors} />
			<ActionButton label="Excluir" icon={Trash2} onPress={handlers.onDelete} colors={colors} />
		</HStack>
	);
}

function LaunchesTableRow({
	item,
	section,
	columns,
	colors,
	selected = false,
	selectionMode = false,
	isHighlighted = false,
	handlers,
}) {
	const isTransacao = section === "transacoes";
	const suppressNextPress = useRef(false);
	const glowAnim = useRef(new Animated.Value(0)).current;
	const animationStartedRef = useRef(false);

	useEffect(() => {
		if (!isHighlighted) {
			animationStartedRef.current = false;
			glowAnim.stopAnimation();
			glowAnim.setValue(0);
			return;
		}
		if (animationStartedRef.current) return;
		animationStartedRef.current = true;
		const animation = Animated.loop(
			Animated.sequence([
				Animated.timing(glowAnim, { toValue: 1, duration: 400, easing: Easing.out(Easing.ease), useNativeDriver: false }),
				Animated.timing(glowAnim, { toValue: 0, duration: 400, easing: Easing.in(Easing.ease), useNativeDriver: false }),
			]),
			{ iterations: 2 }
		);
		animation.start(() => {
			glowAnim.setValue(0);
			animationStartedRef.current = false;
		});
		return () => animation.stop();
	}, [isHighlighted, glowAnim]);

	const handleLongPress = useCallback(() => {
		suppressNextPress.current = true;
		handlers?.onLongPress?.();
	}, [handlers]);

	const handlePress = useCallback(() => {
		if (suppressNextPress.current) {
			suppressNextPress.current = false;
			return;
		}
		if (selectionMode) handlers?.onToggleSelect?.();
	}, [selectionMode, handlers]);

	const rowContent = (
		<View style={{ position: "relative" }}>
			<Animated.View
				pointerEvents="none"
				style={{
					position: "absolute",
					top: 0,
					left: 0,
					right: 0,
					bottom: 0,
					backgroundColor: colors.brand,
					opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.18] }),
				}}
			/>
			<HStack
				className="items-center"
				style={{
					width: "100%",
					maxWidth: 1100,
					alignSelf: "center",
					paddingVertical: 10,
					paddingHorizontal: 4,
					backgroundColor: selected ? colors.brandSoft : "transparent",
				}}
			>
				{columns.map((col) => (
					<View key={col.key} style={cellStyle(col)}>
						{col.render(item, { selectionMode, selected }, col)}
					</View>
				))}
				<View style={{ width: getActionsWidth(section), paddingHorizontal: 6, justifyContent: "center" }}>
					{selectionMode ? null : <RowActions section={section} item={item} colors={colors} handlers={handlers} />}
				</View>
			</HStack>
		</View>
	);

	if (!isTransacao) return rowContent;

	return (
		<Pressable onPress={handlePress} onLongPress={handleLongPress} delayLongPress={350}>
			{rowContent}
		</Pressable>
	);
}

export default memo(LaunchesTableRow);
