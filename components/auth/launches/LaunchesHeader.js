import React, { useRef, useCallback, useState } from "react";
import { useWindowDimensions, ScrollView, View, Pressable } from "react-native";
import { Plus, FileText, ChevronRight, ChevronLeft, SlidersHorizontal, FileUp } from "lucide-react-native";

import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Button, ButtonText, ButtonIcon } from "@/components/ui/button";

import { BLOCKS } from "@/utils/auth/launches/sections";
import SectionButton from "@/components/auth/launches/SectionButton";

const OUTER_PAD = 24;
const CARD_PAD = 32;
const GAP = 8;
const VISIBLE = 3.5;
const FADE_R = [0, 0.15, 0.35, 0.6, 0.82, 1];
const FADE_L = [1, 0.82, 0.6, 0.35, 0.15, 0];

function surfaceWithAlpha(color, alpha) {
	if (color.startsWith("#") && color.length === 7) {
		const r = parseInt(color.slice(1, 3), 16);
		const g = parseInt(color.slice(3, 5), 16);
		const b = parseInt(color.slice(5, 7), 16);
		return `rgba(${r},${g},${b},${alpha})`;
	}
	const m = color.match(/rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)/);
	if (m) return `rgba(${m[1]},${m[2]},${m[3]},${alpha})`;
	return color;
}

export default function LaunchesHeader({
	section,
	onSectionChange,
	config,
	colors,
	onCreate,
	onFilter,
	onImportOfx,
	filterActive = false,
}) {
	const { width: screenWidth } = useWindowDimensions();
	const available = screenWidth - OUTER_PAD - CARD_PAD;
	const buttonWidth = (available - 3 * GAP) / VISIBLE;
	const fadeWidth = Math.round(buttonWidth * 0.6) + GAP;

	const scrollRef = useRef(null);
	const scrollOffsetRef = useRef(0);
	const [atEnd, setAtEnd] = useState(false);

	const handleScroll = useCallback((e) => {
		const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
		scrollOffsetRef.current = contentOffset.x;
		const maxScroll = contentSize.width - layoutMeasurement.width;
		setAtEnd(contentOffset.x >= maxScroll - 1);
	}, []);

	const handleRightPress = useCallback(() => {
		const step = 4 * (buttonWidth + GAP);
		scrollRef.current?.scrollTo({
			x: scrollOffsetRef.current + step,
			animated: true,
		});
	}, [buttonWidth]);

	const handleLeftPress = useCallback(() => {
		const step = 4 * (buttonWidth + GAP);
		scrollRef.current?.scrollTo({
			x: Math.max(0, scrollOffsetRef.current - step),
			animated: true,
		});
	}, [buttonWidth]);

	return (
		<Box className="gap-4 pb-4">
			<Box
				className="gap-2 rounded-3xl border p-4"
				style={{
					backgroundColor: colors.surface,
					borderColor: colors.border,
				}}
			>
				<Text
					className="text-xl font-semibold"
					style={{ color: colors.textPrimary }}
				>
					Gerencie tudo aqui...
				</Text>

				<View style={{ position: "relative", marginTop: 8 }}>
					<ScrollView
						ref={scrollRef}
						horizontal
						showsHorizontalScrollIndicator={false}
						contentContainerStyle={{ gap: GAP }}
						onScroll={handleScroll}
						scrollEventThrottle={16}
					>
						{BLOCKS.map((block) => (
							<SectionButton
								key={block.key}
								active={section === block.key}
								label={block.label}
								icon={block.icon}
								colors={colors}
								onPress={() => onSectionChange(block.key)}
								width={buttonWidth}
							/>
						))}
					</ScrollView>

					{!atEnd && (
						<>
							<View
								pointerEvents="none"
								style={{
									position: "absolute",
									right: 0,
									top: 0,
									bottom: 0,
									width: fadeWidth,
									flexDirection: "row",
								}}
							>
								{FADE_R.map((alpha, i) => (
									<View
										key={i}
										style={{
											flex: 1,
											backgroundColor: surfaceWithAlpha(
												colors.surface,
												alpha
											),
										}}
									/>
								))}
							</View>
							<Pressable
								onPress={handleRightPress}
								style={{
									position: "absolute",
									right: 2,
									top: 0,
									bottom: 0,
									justifyContent: "center",
									paddingHorizontal: 2,
								}}
							>
								<View
									style={{
										borderRadius: 14,
										padding: 4,
										backgroundColor: surfaceWithAlpha(
											colors.surface,
											0.92
										),
									}}
								>
									<ChevronRight
										size={16}
										color={colors.textSecondary}
									/>
								</View>
							</Pressable>
						</>
					)}

					{atEnd && (
						<>
							<View
								pointerEvents="none"
								style={{
									position: "absolute",
									left: 0,
									top: 0,
									bottom: 0,
									width: fadeWidth,
									flexDirection: "row",
								}}
							>
								{FADE_L.map((alpha, i) => (
									<View
										key={i}
										style={{
											flex: 1,
											backgroundColor: surfaceWithAlpha(
												colors.surface,
												alpha
											),
										}}
									/>
								))}
							</View>
							<Pressable
								onPress={handleLeftPress}
								style={{
									position: "absolute",
									left: 2,
									top: 0,
									bottom: 0,
									justifyContent: "center",
									paddingHorizontal: 2,
								}}
							>
								<View
									style={{
										borderRadius: 14,
										padding: 4,
										backgroundColor: surfaceWithAlpha(
											colors.surface,
											0.92
										),
									}}
								>
									<ChevronLeft
										size={16}
										color={colors.textSecondary}
									/>
								</View>
							</Pressable>
						</>
					)}
				</View>
			</Box>

			<Box
				className="gap-2 rounded-2xl border p-4"
				style={{
					backgroundColor: colors.surface,
					borderColor: colors.border,
				}}
			>
				<HStack
					className="items-center justify-between"
					style={{ width: "100%" }}
				>
					<HStack className="items-center gap-2">
						<FileText size={18} color={colors.textPrimary} />
						<Text
							className="font-semibold"
							style={{ color: colors.textPrimary }}
						>
							{config.title}
						</Text>
					</HStack>

					<HStack className="items-center gap-2">
						<Pressable
							onPress={onFilter}
							style={{ padding: 6, position: "relative" }}
						>
							<SlidersHorizontal
								size={18}
								color={filterActive ? colors.brand : colors.textSecondary}
							/>
							{filterActive && (
								<View
									style={{
										position: "absolute",
										top: 2,
										right: 2,
										width: 7,
										height: 7,
										borderRadius: 4,
										backgroundColor: colors.brand,
									}}
								/>
							)}
						</Pressable>
						{section === "transacoes" && onImportOfx ? (
							<Pressable onPress={onImportOfx} style={{ padding: 6 }}>
								<FileUp size={18} color={colors.textSecondary} />
							</Pressable>
						) : null}
						<Button size="sm" onPress={onCreate}>
							<ButtonIcon as={Plus} />
							<ButtonText>Novo</ButtonText>
						</Button>
					</HStack>
				</HStack>
			</Box>
		</Box>
	);
}
