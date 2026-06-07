import { useCallback, useMemo, useState } from "react";
import { Alert } from "react-native";
import { useAuth } from "@/state/AuthContext";
import { useErrorToast } from "@/components/ui/toast/useErrorToast";

export function useFamilyManagement() {
	const {
		userData,
		family,
		familyMembers,
		familyInvites,
		pendingInvite,
		createNewFamily,
		sendFamilyInvite,
		cancelFamilyInvite,
		removeMemberFromFamily,
		transferFamilyOwnership,
		leaveCurrentFamily,
		deleteCurrentFamily,
		acceptPendingInvite,
		declinePendingInvite,
	} = useAuth();
	const { showNewToast } = useErrorToast();

	const [inviteEmail, setInviteEmail] = useState("");
	const [savingInvite, setSavingInvite] = useState(false);
	const [createModalOpen, setCreateModalOpen] = useState(false);
	const [newFamilyName, setNewFamilyName] = useState("");
	const [creatingFamily, setCreatingFamily] = useState(false);
	const [acceptingInvite, setAcceptingInvite] = useState(false);
	const [decliningInvite, setDecliningInvite] = useState(false);

	const isOwner = family?.role === "owner";

	const ownerMember = useMemo(
		() => familyMembers.find((m) => m.role === "owner"),
		[familyMembers]
	);

	const getMemberName = useCallback(
		(member) => {
			if (member?.user_nome) return member.user_nome;
			if (member?.user_id === userData?.id)
				return userData?.nome || userData?.email || member.user_id;
			return member?.user_email || member?.user_id;
		},
		[userData]
	);

	const getMemberEmail = useCallback(
		(member) => {
			if (member?.user_email) return member.user_email;
			if (member?.user_id === userData?.id) return userData?.email || "Sem e-mail";
			return "Sem e-mail";
		},
		[userData]
	);

	const ownerName = useMemo(
		() => getMemberName(ownerMember) ?? "-",
		[ownerMember, getMemberName]
	);

	const handleAcceptInvite = async () => {
		setAcceptingInvite(true);
		try {
			await acceptPendingInvite();
			showNewToast("success", "Bem-vindo à família!");
		} catch (error) {
			showNewToast("error", error?.message || "Falha ao aceitar convite");
		} finally {
			setAcceptingInvite(false);
		}
	};

	const handleDeclineInvite = () => {
		Alert.alert("Recusar convite", "Deseja recusar o convite para esta família?", [
			{ text: "Não", style: "cancel" },
			{
				text: "Recusar",
				style: "destructive",
				onPress: async () => {
					setDecliningInvite(true);
					try {
						await declinePendingInvite();
						showNewToast("success", "Convite recusado");
					} catch (error) {
						showNewToast("error", error?.message || "Falha ao recusar convite");
					} finally {
						setDecliningInvite(false);
					}
				},
			},
		]);
	};

	const handleCreateFamily = async () => {
		const nome = newFamilyName.trim();
		if (!nome) {
			showNewToast("warning", "Digite um nome para a família", "Atenção");
			return;
		}
		setCreatingFamily(true);
		try {
			await createNewFamily(nome);
			setCreateModalOpen(false);
			setNewFamilyName("");
			showNewToast("success", "Família criada com sucesso!");
		} catch (error) {
			showNewToast("error", error?.message || "Falha ao criar família");
		} finally {
			setCreatingFamily(false);
		}
	};

	const handleInvite = async () => {
		const email = String(inviteEmail || "").trim().toLowerCase();
		if (!/^\S+@\S+\.\S+$/.test(email)) {
			showNewToast("warning", "Digite um e-mail válido", "Atenção");
			return;
		}
		setSavingInvite(true);
		try {
			await sendFamilyInvite(email);
			setInviteEmail("");
			showNewToast("success", "Convite enviado com sucesso");
		} catch (error) {
			showNewToast("error", error?.message || "Falha ao enviar convite");
		} finally {
			setSavingInvite(false);
		}
	};

	const confirmCancelInvite = (inviteId) => {
		Alert.alert("Cancelar convite", "Deseja cancelar este convite?", [
			{ text: "Não", style: "cancel" },
			{
				text: "Sim",
				style: "destructive",
				onPress: async () => {
					try {
						await cancelFamilyInvite(inviteId);
						showNewToast("success", "Convite cancelado");
					} catch (error) {
						showNewToast("error", error?.message || "Falha ao cancelar convite");
					}
				},
			},
		]);
	};

	const confirmRemoveMember = (member) => {
		const name = member.user_nome || member.user_email || "membro";
		Alert.alert("Remover membro", `Remover ${name} da família?`, [
			{ text: "Não", style: "cancel" },
			{
				text: "Remover",
				style: "destructive",
				onPress: async () => {
					try {
						await removeMemberFromFamily(member.id);
						showNewToast("success", "Membro removido");
					} catch (error) {
						showNewToast("error", error?.message || "Falha ao remover membro");
					}
				},
			},
		]);
	};

	const confirmTransferOwnership = (member) => {
		const name = member.user_nome || member.user_email || "membro";
		Alert.alert("Transferir ownership", `Deseja tornar ${name} o novo owner?`, [
			{ text: "Cancelar", style: "cancel" },
			{
				text: "Transferir",
				onPress: async () => {
					try {
						await transferFamilyOwnership(member.user_id);
						showNewToast("success", "Ownership transferido");
					} catch (error) {
						showNewToast("error", error?.message || "Falha ao transferir ownership");
					}
				},
			},
		]);
	};

	const confirmLeaveFamily = () => {
		Alert.alert("Sair da família", "Deseja sair da família atual?", [
			{ text: "Cancelar", style: "cancel" },
			{
				text: "Sair",
				style: "destructive",
				onPress: async () => {
					try {
						await leaveCurrentFamily();
						showNewToast("success", "Você saiu da família");
					} catch (error) {
						showNewToast("error", error?.message || "Falha ao sair da família");
					}
				},
			},
		]);
	};

	const confirmDeleteFamily = () => {
		Alert.alert(
			"Excluir família",
			"Esta ação remove a família e os vínculos de todos os membros. Continuar?",
			[
				{ text: "Cancelar", style: "cancel" },
				{
					text: "Excluir",
					style: "destructive",
					onPress: async () => {
						try {
							await deleteCurrentFamily();
							showNewToast("success", "Família excluída");
						} catch (error) {
							showNewToast("error", error?.message || "Falha ao excluir família");
						}
					},
				},
			]
		);
	};

	return {
		family,
		familyMembers,
		familyInvites,
		pendingInvite,
		currentUserId: userData?.id,
		isOwner,
		ownerName,
		getMemberName,
		getMemberEmail,
		inviteEmail,
		setInviteEmail,
		savingInvite,
		createModalOpen,
		setCreateModalOpen,
		newFamilyName,
		setNewFamilyName,
		creatingFamily,
		acceptingInvite,
		decliningInvite,
		handleAcceptInvite,
		handleDeclineInvite,
		handleCreateFamily,
		handleInvite,
		confirmCancelInvite,
		confirmRemoveMember,
		confirmTransferOwnership,
		confirmLeaveFamily,
		confirmDeleteFamily,
	};
}
