import { useEffect, useMemo, useState } from "react";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { Text } from "@/components/ui/text";
import { Button, ButtonText } from "@/components/ui/button";
import { Input, InputField } from "@/components/ui/input";
import {
	Modal,
	ModalBackdrop,
	ModalBody,
	ModalContent,
	ModalFooter,
	ModalHeader,
} from "@/components/ui/modal";
import { FormRadioGroup } from "@/components/ui/radio-button/FormRadioGroup";
import { parseBrNumber } from "@/components/finance/insert/insertFormConfig";

const TIPO_AJUSTE_OPTIONS = [
	{ label: "Acréscimo", value: "receber" },
	{ label: "Decréscimo", value: "pagar" },
];

export function SaldoInicialAjusteModal({
	isOpen,
	onClose,
	saldoInicialLabel,
	saving,
	onSubmit,
	colors,
}) {
	const [step, setStep] = useState("confirm");
	const [motivo, setMotivo] = useState("");
	const [valorText, setValorText] = useState("");
	const [tipo, setTipo] = useState("receber");

	useEffect(() => {
		if (isOpen) {
			setStep("confirm");
			setMotivo("");
			setValorText("");
			setTipo("receber");
		}
	}, [isOpen]);

	const valor = useMemo(() => parseBrNumber(valorText), [valorText]);
	const canSave = motivo.trim().length > 0 && valor > 0;

	return (
		<Modal isOpen={isOpen} onClose={onClose} size="md">
			<ModalBackdrop />
			<ModalContent>
				<ModalHeader>
					<Text
						className="text-lg font-semibold"
						style={{ color: colors.textPrimary }}
					>
						{step === "confirm" ? "Saldo inicial" : "Ajuste de saldo inicial"}
					</Text>
				</ModalHeader>

				<ModalBody>
					{step === "confirm" ? (
						<VStack className="gap-2">
							<Text style={{ color: colors.textSecondary }}>
								O saldo inicial é o que sobrou dos períodos anteriores ao
								filtro atual.
							</Text>
							<Text style={{ color: colors.textPrimary }}>
								Saldo inicial atual:{" "}
								<Text className="font-bold" style={{ color: colors.textPrimary }}>
									{saldoInicialLabel}
								</Text>
							</Text>
							<Text style={{ color: colors.textSecondary }}>
								Deseja lançar uma ocorrência de ajuste?
							</Text>
						</VStack>
					) : (
						<VStack className="gap-3">
							<Box className="gap-1">
								<Text
									className="text-xs"
									style={{ color: colors.textSecondary }}
								>
									Motivo do ajuste
								</Text>
								<Input
									variant="outline"
									style={{
										borderColor: colors.border,
										backgroundColor: colors.surface,
									}}
								>
									<InputField
										value={motivo}
										onChangeText={setMotivo}
										placeholder="Ex: saldo em conta não registrado"
										style={{ color: colors.textPrimary }}
									/>
								</Input>
							</Box>

							<Box className="gap-1">
								<Text
									className="text-xs"
									style={{ color: colors.textSecondary }}
								>
									Valor do ajuste
								</Text>
								<Input
									variant="outline"
									style={{
										borderColor: colors.border,
										backgroundColor: colors.surface,
									}}
								>
									<InputField
										value={valorText}
										onChangeText={setValorText}
										placeholder="Ex: 150,00"
										keyboardType="numeric"
										style={{ color: colors.textPrimary }}
									/>
								</Input>
							</Box>

							<FormRadioGroup
								label="Tipo de ajuste"
								value={tipo}
								onChange={setTipo}
								options={TIPO_AJUSTE_OPTIONS}
								orientation="horizontal"
							/>
						</VStack>
					)}
				</ModalBody>

				<ModalFooter>
					<HStack className="gap-2 flex-1">
						<Button
							variant="outline"
							className="flex-1"
							onPress={onClose}
							isDisabled={saving}
						>
							<ButtonText>Cancelar</ButtonText>
						</Button>
						{step === "confirm" ? (
							<Button className="flex-1" onPress={() => setStep("form")}>
								<ButtonText>Editar</ButtonText>
							</Button>
						) : (
							<Button
								className="flex-1"
								onPress={() => onSubmit({ motivo: motivo.trim(), valor, tipo })}
								isDisabled={!canSave || saving}
							>
								<ButtonText>{saving ? "Salvando..." : "Salvar"}</ButtonText>
							</Button>
						)}
					</HStack>
				</ModalFooter>
			</ModalContent>
		</Modal>
	);
}
