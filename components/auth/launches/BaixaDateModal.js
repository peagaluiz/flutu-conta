import { useState, useCallback, useEffect } from "react";
import { CalendarDays } from "lucide-react-native";
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

export function BaixaDateModal({ isOpen, onClose, onApply }) {
    const { theme } = useTheme();
    const colors = getThemeColors(theme);
    const [pendingDate, setPendingDate] = useState(null);
    const [showPicker, setShowPicker] = useState(false);

    useEffect(() => {
        if (isOpen) setPendingDate(null);
    }, [isOpen]);

    const handleConfirm = useCallback(({ date }) => {
        setShowPicker(false);
        if (date) setPendingDate(toISODateString(date));
    }, []);

    const handleApply = useCallback(() => {
        onApply(pendingDate);
        onClose();
    }, [pendingDate, onApply, onClose]);

    const handleClose = useCallback(() => {
        setShowPicker(false);
        onClose();
    }, [onClose]);

    const dateLabel = pendingDate
        ? pendingDate.split("-").reverse().join("/")
        : "Selecionar data";

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
                            Data de baixa
                        </Text>
                    </ModalHeader>

                    <ModalBody>
                        <Pressable onPress={() => setShowPicker(true)}>
                            <Box
                                className="flex-row items-center rounded-xl border px-3 py-3"
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
                                            color: pendingDate
                                                ? colors.textPrimary
                                                : colors.textSecondary,
                                        }}
                                    >
                                        {dateLabel}
                                    </Text>
                                </HStack>
                            </Box>
                        </Pressable>
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
                            <Button
                                className="flex-1"
                                onPress={handleApply}
                                isDisabled={!pendingDate}
                            >
                                <ButtonText>Salvar</ButtonText>
                            </Button>
                        </HStack>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            <DatePickerDialog
                visible={showPicker}
                locale="pt"
                mode="single"
                date={
                    pendingDate
                        ? new Date(`${pendingDate}T00:00:00`)
                        : undefined
                }
                onDismiss={() => setShowPicker(false)}
                onConfirm={handleConfirm}
            />
        </>
    );
}
