import { useState, useCallback, useEffect } from "react";
import { CalendarDays, ChevronDown } from "lucide-react-native";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { Button, ButtonText } from "@/components/ui/button";
import { Pressable } from "@/components/ui/pressable";
import {
	Modal,
	ModalBackdrop,
	ModalBody,
	ModalContent,
	ModalFooter,
	ModalHeader,
} from "@/components/ui/modal";
import { DatePickerDialog } from "@/components/ui/DatePickerDialog";
import { useTheme } from "@/components/ui/gluestack-ui-provider/ThemeProvider/ThemeProvider";
import { getThemeColors } from "@/constants/colors";
import { toISODateString } from "@/utils/finance/helpers";

export function HomeDateFilterModal({ isOpen, dateRange, onClose, onApply }) {
	const { theme } = useTheme();
	const colors = getThemeColors(theme);

	const [pendingStart, setPendingStart] = useState(dateRange?.start ?? null);
	const [pendingEnd, setPendingEnd] = useState(dateRange?.end ?? null);
	const [showRangePicker, setShowRangePicker] = useState(false);

	useEffect(() => {
		if (isOpen) {
			setPendingStart(dateRange?.start ?? null);
			setPendingEnd(dateRange?.end ?? null);
		}
	}, [isOpen, dateRange?.start, dateRange?.end]);

	const handleRangeConfirm = useCallback(({ startDate, endDate }) => {
		setShowRangePicker(false);
		if (startDate) setPendingStart(toISODateString(startDate));
		if (endDate) setPendingEnd(toISODateString(endDate));
	}, []);

	const handleApply = useCallback(() => {
		if (pendingStart && pendingEnd) {
			onApply({ start: pendingStart, end: pendingEnd });
		}
		onClose();
	}, [pendingStart, pendingEnd, onApply, onClose]);

	const handleClose = useCallback(() => {
		setShowRangePicker(false);
		onClose();
	}, [onClose]);

	const dateLabel =
		pendingStart && pendingEnd
			? `${pendingStart.split("-").reverse().join("/")} até ${pendingEnd.split("-").reverse().join("/")}`
			: "Selecionar período";

	return (
		<>
			<Modal isOpen={isOpen} onClose={handleClose} size="md">
				<ModalBackdrop />
				<ModalContent>
					<ModalHeader>
						<Text
							className="text-lg font-semibold"
							style={{ color: colors.textPrimary }}
						>
							Filtrar por período
						</Text>
					</ModalHeader>

					<ModalBody>
						<Box className="gap-2">
							<Text
								className="text-xs"
								style={{ color: colors.textSecondary }}
							>
								Período
							</Text>
							<Pressable onPress={() => setShowRangePicker(true)}>
								<Box
									className="flex-row items-center justify-between rounded-xl border px-3 py-3"
									style={{
										backgroundColor: colors.surfaceMuted,
										borderColor: colors.border,
									}}
								>
									<HStack className="items-center gap-2">
										<CalendarDays
											size={16}
											color={colors.textPrimary}
										/>
										<Text
											style={{
												color:
													pendingStart && pendingEnd
														? colors.textPrimary
														: colors.textSecondary,
											}}
										>
											{dateLabel}
										</Text>
									</HStack>
									<ChevronDown
										size={16}
										color={colors.textSecondary}
									/>
								</Box>
							</Pressable>
						</Box>
					</ModalBody>

					<ModalFooter>
						<HStack className="gap-2 flex-1">
							<Button
								variant="outline"
								className="flex-1"
								onPress={handleClose}
							>
								<ButtonText>Cancelar</ButtonText>
							</Button>
							<Button className="flex-1" onPress={handleApply}>
								<ButtonText>Aplicar Filtros</ButtonText>
							</Button>
						</HStack>
					</ModalFooter>
				</ModalContent>
			</Modal>

			<DatePickerDialog
				visible={showRangePicker}
				locale="pt"
				mode="range"
				startDate={
					pendingStart
						? new Date(`${pendingStart}T00:00:00`)
						: undefined
				}
				endDate={
					pendingEnd
						? new Date(`${pendingEnd}T12:00:00`)
						: undefined
				}
				onDismiss={() => setShowRangePicker(false)}
				onConfirm={handleRangeConfirm}
			/>
		</>
	);
}
