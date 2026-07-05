import React from "react";
import { Switch, ScrollView } from "react-native";
import {
	Modal,
	ModalBackdrop,
	ModalBody,
	ModalContent,
	ModalFooter,
	ModalHeader,
} from "@/components/ui/modal";
import { Button, ButtonText } from "@/components/ui/button";
import { Input, InputField } from "@/components/ui/input";
import { Box } from "@/components/ui/box";
import { VStack } from "@/components/ui/vstack";
import { Text } from "@/components/ui/text";
import { Pressable } from "@/components/ui/pressable";

function PessoaOptionsList({ pessoaOptions, selectedPessoaId, onSelect, colors }) {
	return (
		<VStack className="gap-2">
			<Text className="text-xs" style={{ color: colors.textSecondary }}>
				Ou vincule a uma pessoa já cadastrada
			</Text>
			<VStack className="max-h-48 gap-2">
				{pessoaOptions.slice(0, 8).map((pessoa) => {
					const active =
						Number(selectedPessoaId) === Number(pessoa.id_pessoa);
					return (
						<Pressable
							key={String(pessoa.id_pessoa)}
							onPress={() => onSelect(pessoa)}
						>
							<Box
								className="rounded-xl border px-3 py-2"
								style={{
									borderColor: active
										? colors.textPrimary
										: colors.border,
									backgroundColor: active
										? colors.surfaceMuted
										: colors.surface,
								}}
							>
								<Text style={{ color: colors.textPrimary }}>
									{pessoa.nome}
								</Text>
							</Box>
						</Pressable>
					);
				})}
			</VStack>
		</VStack>
	);
}

const BANCO_COLORS = [
	"#820AD1", "#FF7A00", "#3B82F6", "#EF4444", "#10B981",
	"#F59E0B", "#6366F1", "#EC4899", "#14B8A6", "#111827",
	"#6B7280", "#DC2626",
];

function BancoColorPicker({ value, onChange, colors }) {
	return (
		<VStack className="gap-2">
			<Text className="text-xs" style={{ color: colors.textSecondary }}>
				Cor do banco
			</Text>
			<ScrollView horizontal showsHorizontalScrollIndicator={false}>
				<Box className="flex-row gap-2 py-1">
					{BANCO_COLORS.map((cor) => {
						const active = value === cor;
						return (
							<Pressable key={cor} onPress={() => onChange(cor)}>
								<Box
									className="rounded-full"
									style={{
										width: 32,
										height: 32,
										backgroundColor: cor,
										borderWidth: active ? 3 : 1,
										borderColor: active ? colors.textPrimary : "transparent",
									}}
								/>
							</Pressable>
						);
					})}
				</Box>
			</ScrollView>
		</VStack>
	);
}

function BancoTipoToggle({ label, description, value, onValueChange, colors }) {
	return (
		<Box className="flex-row items-center justify-between rounded-xl px-3 py-2" style={{ backgroundColor: colors.surfaceMuted }}>
			<Box className="flex-1 pr-3">
				<Text className="font-semibold" style={{ color: colors.textPrimary }}>
					{label}
				</Text>
				{description ? (
					<Text size="sm" style={{ color: colors.textSecondary }}>
						{description}
					</Text>
				) : null}
			</Box>
			<Switch
				value={value}
				onValueChange={onValueChange}
				trackColor={{ false: colors.borderStrong, true: colors.success }}
				thumbColor={colors.surface}
			/>
		</Box>
	);
}

function CartaoDiasInputs({
	diaFechamento,
	setDiaFechamento,
	diaVencimento,
	setDiaVencimento,
	colors,
}) {
	const sanitize = (text) => text.replace(/[^0-9]/g, "").slice(0, 2);
	return (
		<Box className="flex-row gap-3">
			<VStack className="flex-1 gap-2">
				<Text className="text-xs" style={{ color: colors.textSecondary }}>
					Dia de fechamento
				</Text>
				<Input
					variant="outline"
					style={{ borderColor: colors.border, backgroundColor: colors.surface }}
				>
					<InputField
						value={diaFechamento}
						onChangeText={(t) => setDiaFechamento(sanitize(t))}
						placeholder="Ex: 28"
						keyboardType="number-pad"
						style={{ color: colors.textPrimary }}
					/>
				</Input>
			</VStack>
			<VStack className="flex-1 gap-2">
				<Text className="text-xs" style={{ color: colors.textSecondary }}>
					Dia de vencimento
				</Text>
				<Input
					variant="outline"
					style={{ borderColor: colors.border, backgroundColor: colors.surface }}
				>
					<InputField
						value={diaVencimento}
						onChangeText={(t) => setDiaVencimento(sanitize(t))}
						placeholder="Ex: 7"
						keyboardType="number-pad"
						style={{ color: colors.textPrimary }}
					/>
				</Input>
			</VStack>
		</Box>
	);
}

function FamilyShareToggle({ value, onValueChange, colors }) {
	return (
		<Box
			className="mt-1 mb-1 rounded-xl px-3 py-3"
			style={{ backgroundColor: colors.surfaceMuted }}
		>
			<Box className="flex-row items-center justify-between">
				<Box className="flex-1 pr-3">
					<Text
						className="font-semibold"
						style={{ color: colors.textPrimary }}
					>
						Compartilhar com a família
					</Text>
					<Text size="sm" style={{ color: colors.textSecondary }}>
						Se ativado, este cadastro ficará visível para os membros
						da família.
					</Text>
				</Box>
				<Switch
					value={value}
					onValueChange={onValueChange}
					trackColor={{
						false: colors.borderStrong,
						true: colors.success,
					}}
					thumbColor={colors.surface}
				/>
			</Box>
		</Box>
	);
}

export default function LaunchesEditorModal({
	isOpen,
	onClose,
	editorMode,
	section,
	editingItem,
	editorValue,
	setEditorValue,
	editorCor,
	setEditorCor,
	editorIsCorrente,
	setEditorIsCorrente,
	editorIsCartao,
	setEditorIsCartao,
	editorDiaFechamento,
	setEditorDiaFechamento,
	editorDiaVencimento,
	setEditorDiaVencimento,
	selectedPessoaId,
	pessoaOptions,
	onSelectPessoa,
	shareWithFamily,
	setShareWithFamily,
	savingEditor,
	onSave,
	family,
	colors,
}) {
	const isPending = Number(editingItem?.is_pending || 0) === 1;
	const showPessoaOptions =
		section === "pessoas" && isPending && pessoaOptions.length > 0;
	const isBanco = section === "bancos";

	const sectionLabel = isBanco ? "banco" : section === "pessoas" ? "pessoa" : "imobilizado";

	return (
		<Modal isOpen={isOpen} onClose={onClose} size="md">
			<ModalBackdrop />
			<ModalContent>
				<ModalHeader>
					<Text
						className="text-lg font-semibold"
						style={{ color: colors.textPrimary }}
					>
						{editorMode === "edit" ? "Editar" : "Novo"} {sectionLabel}
					</Text>
				</ModalHeader>

				<ModalBody>
					<VStack className="gap-3">
						<Text style={{ color: colors.textSecondary }}>
							{isBanco
								? "Nome do banco"
								: section === "pessoas"
								? isPending
									? "Corrija o texto ou vincule a uma pessoa cadastrada"
									: "Nome da pessoa"
								: "Nome do imobilizado"}
						</Text>

						<Input
							variant="outline"
							style={{
								borderColor: colors.border,
								backgroundColor: colors.surface,
							}}
						>
							<InputField
								value={editorValue}
								onChangeText={setEditorValue}
								placeholder={
									isBanco
										? "Ex: Nubank"
										: section === "pessoas"
										? "Ex: João"
										: "Ex: Computador do escritório"
								}
								style={{ color: colors.textPrimary }}
							/>
						</Input>

						{isBanco ? (
							<BancoColorPicker
								value={editorCor}
								onChange={setEditorCor}
								colors={colors}
							/>
						) : null}

						{isBanco ? (
							<VStack className="gap-2">
								<Text className="text-xs" style={{ color: colors.textSecondary }}>
									Este banco é usado como
								</Text>
								<BancoTipoToggle
									label="Conta corrente"
									value={editorIsCorrente}
									onValueChange={setEditorIsCorrente}
									colors={colors}
								/>
								<BancoTipoToggle
									label="Cartão de crédito"
									description="Lança compras parceladas em faturas."
									value={editorIsCartao}
									onValueChange={setEditorIsCartao}
									colors={colors}
								/>
							</VStack>
						) : null}

						{isBanco && editorIsCartao ? (
							<CartaoDiasInputs
								diaFechamento={editorDiaFechamento}
								setDiaFechamento={setEditorDiaFechamento}
								diaVencimento={editorDiaVencimento}
								setDiaVencimento={setEditorDiaVencimento}
								colors={colors}
							/>
						) : null}

						{showPessoaOptions ? (
							<PessoaOptionsList
								pessoaOptions={pessoaOptions}
								selectedPessoaId={selectedPessoaId}
								onSelect={onSelectPessoa}
								colors={colors}
							/>
						) : null}

						{editorMode === "create" && family?.id && !isBanco ? (
							<FamilyShareToggle
								value={shareWithFamily}
								onValueChange={setShareWithFamily}
								colors={colors}
							/>
						) : null}
					</VStack>
				</ModalBody>

				<ModalFooter>
					<Button
						action="secondary"
						variant="outline"
						onPress={onClose}
						isDisabled={savingEditor}
					>
						<ButtonText>Cancelar</ButtonText>
					</Button>
					<Button onPress={onSave} isDisabled={savingEditor}>
						<ButtonText>
							{savingEditor ? "Salvando..." : "Salvar"}
						</ButtonText>
					</Button>
				</ModalFooter>
			</ModalContent>
		</Modal>
	);
}
