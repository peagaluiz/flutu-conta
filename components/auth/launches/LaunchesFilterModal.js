import { useState, useCallback, useEffect } from "react";
import { TextInput } from "react-native";
import { CalendarDays, ChevronDown, Search } from "lucide-react-native";
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
import { FormRadioGroup } from "@/components/ui/radio-button/FormRadioGroup";
import { toISODateString } from "@/utils/finance/helpers";

const DATE_FIELD_OPTIONS = [
    { label: "Vencimento", value: "data_vencimento" },
    { label: "Data de baixa", value: "data_baixa" },
];

export function LaunchesFilterModal({ isOpen, onClose, onApply, initialFilters, colors }) {
    const [pendingSearch, setPendingSearch] = useState("");
    const [pendingDateField, setPendingDateField] = useState("data_vencimento");
    const [pendingStart, setPendingStart] = useState(null);
    const [pendingEnd, setPendingEnd] = useState(null);
    const [showRangePicker, setShowRangePicker] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setPendingSearch(initialFilters?.searchText ?? "");
            setPendingDateField(initialFilters?.dateField ?? "data_vencimento");
            setPendingStart(initialFilters?.dateFrom ?? null);
            setPendingEnd(initialFilters?.dateTo ?? null);
        }
    }, [isOpen, initialFilters?.searchText, initialFilters?.dateField, initialFilters?.dateFrom, initialFilters?.dateTo]);

    const handleRangeConfirm = useCallback(({ startDate, endDate }) => {
        setShowRangePicker(false);
        if (startDate) setPendingStart(toISODateString(startDate));
        if (endDate) setPendingEnd(toISODateString(endDate));
    }, []);

    const handleApply = useCallback(() => {
        onApply({
            searchText: pendingSearch.trim(),
            dateFrom: pendingStart,
            dateTo: pendingEnd,
            dateField: pendingDateField,
        });
        onClose();
    }, [pendingSearch, pendingStart, pendingEnd, pendingDateField, onApply, onClose]);

    const handleClear = useCallback(() => {
        setPendingSearch("");
        setPendingStart(null);
        setPendingEnd(null);
        setPendingDateField("data_vencimento");
    }, []);

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
                            Filtrar lançamentos
                        </Text>
                    </ModalHeader>

                    <ModalBody>
                        <Box className="gap-4">
                            <Box className="gap-2">
                                <Text
                                    className="text-xs"
                                    style={{ color: colors.textSecondary }}
                                >
                                    Pesquisar
                                </Text>
                                <Box
                                    className="flex-row items-center rounded-xl border px-3 py-2 gap-2"
                                    style={{
                                        backgroundColor: colors.surfaceMuted,
                                        borderColor: colors.border,
                                    }}
                                >
                                    <Search size={16} color={colors.textSecondary} />
                                    <TextInput
                                        value={pendingSearch}
                                        onChangeText={setPendingSearch}
                                        placeholder="Categoria, pessoa ou descrição..."
                                        placeholderTextColor={colors.textSecondary}
                                        style={{ flex: 1, color: colors.textPrimary, fontSize: 14, paddingVertical: 2 }}
                                        returnKeyType="done"
                                        autoCorrect={false}
                                    />
                                </Box>
                            </Box>

                            <FormRadioGroup
                                label="Filtrar por data"
                                value={pendingDateField}
                                onChange={setPendingDateField}
                                options={DATE_FIELD_OPTIONS}
                                orientation="horizontal"
                            />

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
                                            <CalendarDays size={16} color={colors.textPrimary} />
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
                                        <ChevronDown size={16} color={colors.textSecondary} />
                                    </Box>
                                </Pressable>
                            </Box>
                        </Box>
                    </ModalBody>

                    <ModalFooter>
                        <HStack className="gap-2 flex-1">
                            <Button variant="outline" className="flex-1" onPress={handleClear}>
                                <ButtonText>Limpar tudo</ButtonText>
                            </Button>
                            <Button className="flex-1" onPress={handleApply}>
                                <ButtonText>Aplicar</ButtonText>
                            </Button>
                        </HStack>
                    </ModalFooter>
                </ModalContent>
            </Modal>

            <DatePickerDialog
                visible={showRangePicker}
                locale="pt"
                mode="range"
                startDate={pendingStart ? new Date(`${pendingStart}T00:00:00`) : undefined}
                endDate={pendingEnd ? new Date(`${pendingEnd}T12:00:00`) : undefined}
                onDismiss={() => setShowRangePicker(false)}
                onConfirm={handleRangeConfirm}
            />
        </>
    );
}
