import { Box } from "@/components/ui/box";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import {
	Modal,
	ModalBackdrop,
	ModalBody,
	ModalContent,
	ModalFooter,
	ModalHeader,
} from "@/components/ui/modal";
import { Button, ButtonText } from "@/components/ui/button";
import { formatCurrency } from "@/utils/finance/helpers";

// Lista compacta de saldos por banco do card de resumo, com modal de "ver todos".

const BANKS_INLINE_LIMIT = 3;

function BankRow({ bank, field, colors }) {
    return (
        <Box className="flex-row items-center justify-between">
            <Box className="flex-row items-center gap-2">
                <Box
                    className="rounded-full"
                    style={{ width: 8, height: 8, backgroundColor: bank.cor_hex || "#6B7280" }}
                />
                <Text className="text-xs" style={{ color: colors.textSecondary }}>
                    {bank.nome}
                </Text>
            </Box>
            <Text className="text-xs font-semibold" style={{ color: colors.textPrimary }}>
                {formatCurrency(bank[field] ?? 0)}
            </Text>
        </Box>
    );
}

export function BanksList({ banks, field, colors, onShowAll }) {
    const sorted = [...banks].sort((a, b) => (b[field] ?? 0) - (a[field] ?? 0));
    const visible = sorted.slice(0, BANKS_INLINE_LIMIT);
    const overflow = sorted.length - BANKS_INLINE_LIMIT;

    return (
        <Box className="gap-1 mt-2 pt-2 border-t" style={{ borderColor: colors.border }}>
            {visible.map((bank) => (
                <BankRow key={String(bank.id_banco)} bank={bank} field={field} colors={colors} />
            ))}
            {overflow > 0 && (
                <Pressable onPress={onShowAll}>
                    <Text
                        className="text-xs font-semibold mt-1"
                        style={{ color: colors.textSecondary }}
                    >
                        +{overflow} banco{overflow > 1 ? "s" : ""}
                    </Text>
                </Pressable>
            )}
        </Box>
    );
}

export function BancosAllModal({ isOpen, onClose, banks, colors }) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} size="md">
            <ModalBackdrop />
            <ModalContent>
                <ModalHeader>
                    <Text className="text-lg font-semibold" style={{ color: colors.textPrimary }}>
                        Todos os bancos
                    </Text>
                </ModalHeader>
                <ModalBody>
                    <Box className="gap-3">
                        {banks.map((bank) => (
                            <Box
                                key={String(bank.id_banco)}
                                className="flex-row items-center justify-between rounded-xl border px-3 py-3"
                                style={{
                                    backgroundColor: colors.surfaceMuted,
                                    borderColor: colors.border,
                                }}
                            >
                                <Box className="flex-row items-center gap-2">
                                    <Box
                                        className="rounded-full"
                                        style={{
                                            width: 10,
                                            height: 10,
                                            backgroundColor: bank.cor_hex || "#6B7280",
                                        }}
                                    />
                                    <Text
                                        className="font-semibold"
                                        style={{ color: colors.textPrimary }}
                                    >
                                        {bank.nome}
                                    </Text>
                                </Box>
                                <Box className="items-end gap-0.5">
                                    <Text
                                        className="text-xs font-semibold"
                                        style={{ color: colors.textPrimary }}
                                    >
                                        {formatCurrency(bank.saldo ?? 0)}
                                    </Text>
                                    <Text className="text-xs" style={{ color: "#DC2626" }}>
                                        {formatCurrency(bank.divida ?? 0)} dívida
                                    </Text>
                                </Box>
                            </Box>
                        ))}
                    </Box>
                </ModalBody>
                <ModalFooter>
                    <Button variant="outline" onPress={onClose}>
                        <ButtonText>Fechar</ButtonText>
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
