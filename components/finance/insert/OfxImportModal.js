import React, { useState } from "react";
import { ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import {
	Modal,
	ModalBackdrop,
	ModalBody,
	ModalContent,
	ModalFooter,
	ModalHeader,
} from "@/components/ui/modal";
import { Button, ButtonText, ButtonIcon } from "@/components/ui/button";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { Text } from "@/components/ui/text";
import { Pressable } from "@/components/ui/pressable";
import { FileUp, CreditCard, Landmark } from "lucide-react-native";
import { useDatabase } from "@/hooks/useDatabase";
import { useErrorToast } from "@/components/ui/toast/useErrorToast";
import { useTheme } from "@/components/ui/gluestack-ui-provider/ThemeProvider/ThemeProvider";
import { getThemeColors } from "@/constants/colors";
import { useOfxImport } from "@/state/OfxImportContext";
import { parseOfx } from "@/utils/ofx/parseOfx";
import { pickOfxFile } from "@/utils/ofx/pickOfxFile";
import { buildFaturaDates } from "@/services/database/cartaoCalc";
import { cleanDescription, cleanPersonName, normalizePersonKey } from "@/utils/ofx/cleanOfxFields";

function bancoFlags(b) {
	const legacyCartao = b.tipo === "cartao_credito";
	return {
		isCorrente: b.is_corrente != null ? Number(b.is_corrente) === 1 : !legacyCartao,
		isCartao: b.is_cartao != null ? Number(b.is_cartao) === 1 : legacyCartao,
	};
}

function findMatch(item, existing) {
	const valor = Math.abs(Number(item.amount || 0));
	const desc = normalizePersonKey(item.descricao);
	return existing.find((t) => {
		if (Math.abs(Number(t.valor || 0) - valor) > 0.001) return false;
		let tDesc = "";
		try {
			tDesc = JSON.parse(t.json || "{}")?.descricao || "";
		} catch {}
		tDesc = normalizePersonKey(tDesc || t.observacao || "");
		if (!desc || !tDesc) return false;
		return tDesc.includes(desc) || desc.includes(tDesc);
	});
}

export function OfxImportModal({ isOpen, onClose, userId = null }) {
	const router = useRouter();
	const database = useDatabase();
	const { showNewToast } = useErrorToast();
	const { startImport } = useOfxImport();
	const { theme } = useTheme();
	const colors = getThemeColors(theme);

	const [stage, setStage] = useState("pick"); // 'pick' | 'bank'
	const [loading, setLoading] = useState(false);
	const [parsed, setParsed] = useState(null);
	const [fileName, setFileName] = useState("");
	const [banks, setBanks] = useState([]);

	const isCredit = parsed?.accountType === "credit";

	const reset = () => {
		setStage("pick");
		setLoading(false);
		setParsed(null);
		setFileName("");
		setBanks([]);
	};

	const handleClose = () => {
		reset();
		onClose();
	};

	const handlePick = async () => {
		try {
			setLoading(true);
			const picked = await pickOfxFile();
			if (!picked) {
				setLoading(false);
				return;
			}
			const result = parseOfx(picked.content);
			if (!result.transactions.length) {
				showNewToast("warning", "Nenhuma transação encontrada no arquivo.", "OFX");
				setLoading(false);
				return;
			}
			const credit = result.accountType === "credit";
			const userBancos = await database
				.listBancos({ visibilityScope: "mine", userId: userId ?? undefined })
				.catch(() => []);
			const filtered = (userBancos || []).filter((b) => {
				const f = bancoFlags(b);
				return credit ? f.isCartao : f.isCorrente;
			});

			setParsed(result);
			setFileName(picked.name);
			setBanks(filtered);
			setStage("bank");
			setLoading(false);
		} catch (error) {
			showNewToast("error", String(error?.message || error || "Falha ao ler o arquivo OFX."), "Erro");
			setLoading(false);
		}
	};

	const handleSelectBank = async (bank) => {
		try {
			setLoading(true);
			const credit = parsed.accountType === "credit";
			const fitids = parsed.transactions.map((t) => t.fitid).filter(Boolean);
			const existingFitids = await database.findExistingFitids(fitids).catch(() => new Set());

			let faturaTx = [];
			let dates = null;
			if (credit) {
				const refDate = parsed.dtEnd || parsed.transactions[0]?.date || null;
				dates = buildFaturaDates(refDate, bank.dia_fechamento, bank.dia_vencimento);
				const existingFatura = await database
					.findFaturaByMes(Number(bank.id_banco), dates.mesReferencia)
					.catch(() => null);
				if (existingFatura?.id_fatura) {
					faturaTx = await database.listTransacoesByFatura(existingFatura.id_fatura).catch(() => []);
				}
			}

			const rows = parsed.transactions.map((t, idx) => {
				const descricao = cleanDescription(t.memo) || t.descricao;
				const pessoa = cleanPersonName(t.name, t.memo, credit);
				const duplicate = t.fitid ? existingFitids.has(t.fitid) : false;
				const matched = credit ? Boolean(findMatch({ ...t, descricao }, faturaTx)) : false;
				return {
					...t,
					key: `${t.fitid || "nofit"}-${idx}`,
					duplicate,
					matched,
					checked: !duplicate && !matched,
					descricao,
					pessoa,
					id_categoria: null,
				};
			});

			startImport({
				fileName,
				isCredit: credit,
				bank,
				faturaDates: dates,
				rows,
			});
			reset();
			onClose();
			router.push({ pathname: "/(auth)/(stack)/ofx-import", params: { from: "launches" } });
		} catch (error) {
			showNewToast("error", String(error?.message || error || "Falha ao preparar a importação."), "Erro");
			setLoading(false);
		}
	};

	return (
		<Modal isOpen={isOpen} onClose={handleClose} size="md">
			<ModalBackdrop />
			<ModalContent>
				<ModalHeader>
					<VStack>
						<Text className="text-lg font-semibold" style={{ color: colors.textPrimary }}>
							Importar OFX
						</Text>
						{parsed ? (
							<Text className="text-xs" style={{ color: colors.textSecondary }}>
								{isCredit ? "Fatura de cartão" : "Extrato de conta"} • {fileName}
							</Text>
						) : null}
					</VStack>
				</ModalHeader>

				<ModalBody>
					{stage === "pick" ? (
						<VStack className="items-center gap-3 py-6">
							<FileUp size={40} color={colors.textSecondary} />
							<Text className="text-center" style={{ color: colors.textSecondary }}>
								Selecione o arquivo .ofx do extrato ou da fatura.
							</Text>
							<Button onPress={handlePick} isDisabled={loading}>
								<ButtonIcon as={FileUp} />
								<ButtonText>{loading ? "Lendo..." : "Selecionar arquivo"}</ButtonText>
							</Button>
						</VStack>
					) : loading ? (
						<VStack className="items-center gap-3 py-8">
							<ActivityIndicator color={colors.textPrimary} />
							<Text style={{ color: colors.textSecondary }}>Preparando...</Text>
						</VStack>
					) : (
						<VStack className="gap-2">
							<Text className="text-sm" style={{ color: colors.textSecondary }}>
								{isCredit ? "Em qual cartão lançar esta fatura?" : "Em qual conta lançar este extrato?"}
							</Text>
							{!banks.length ? (
								<Text className="py-3" style={{ color: colors.textSecondary }}>
									Nenhum {isCredit ? "cartão" : "conta"} cadastrado. Cadastre em Lançamentos → Bancos
									(marque {isCredit ? "Cartão de crédito" : "Conta corrente"}).
								</Text>
							) : (
								banks.map((bank) => (
									<Pressable key={String(bank.id_banco)} onPress={() => handleSelectBank(bank)}>
										<HStack
											className="items-center gap-3 rounded-xl border px-3 py-3"
											style={{ backgroundColor: colors.surface, borderColor: colors.border }}
										>
											<Box
												className="rounded-full items-center justify-center"
												style={{ width: 30, height: 30, backgroundColor: bank.cor_hex || "#6B7280" }}
											>
												{isCredit ? <CreditCard size={15} color="#FFF" /> : <Landmark size={15} color="#FFF" />}
											</Box>
											<Text className="flex-1 font-medium" style={{ color: colors.textPrimary }}>
												{bank.nome}
											</Text>
										</HStack>
									</Pressable>
								))
							)}
						</VStack>
					)}
				</ModalBody>

				<ModalFooter>
					<Button action="secondary" variant="outline" onPress={handleClose}>
						<ButtonText>Cancelar</ButtonText>
					</Button>
				</ModalFooter>
			</ModalContent>
		</Modal>
	);
}
