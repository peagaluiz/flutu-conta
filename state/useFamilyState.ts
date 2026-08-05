import { useCallback, useEffect, useState } from "react";
import {
	acceptFamilyInviteById,
	cancelInvite,
	createFamily,
	declineFamilyInviteById,
	deleteFamily,
	FamilyInvite,
	FamilyMember,
	FamilySnapshot,
	getFamilySnapshot,
	inviteFamilyMember,
	leaveFamily,
	PendingInvite,
	removeFamilyMember,
	transferOwnership,
} from "@/services/supabase/familyRepository";

export type FamilyInfo = {
	id: number;
	nome: string;
	ownerUserId: string;
	memberCount: number;
	role: "owner" | "member" | null;
};

export type FamilyUserPatch = {
	familyId: number | null;
	familyRole: "owner" | "member" | null;
	familyName: string | null;
};

type Params = {
	isLoggedIn: boolean;
	userId?: string | null;
	// Espelha família/papel dentro do usuário do AuthContext.
	onUserPatch: (patch: FamilyUserPatch) => void;
};

const NO_FAMILY_PATCH: FamilyUserPatch = {
	familyId: null,
	familyRole: null,
	familyName: null,
};

// Todo o estado de família que antes vivia dentro do AuthProvider.
export function useFamilyState({ isLoggedIn, userId, onUserPatch }: Params) {
	const [family, setFamily] = useState<FamilyInfo | null>(null);
	const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
	const [familyInvites, setFamilyInvites] = useState<FamilyInvite[]>([]);
	const [familySnapshot, setFamilySnapshot] = useState<FamilySnapshot | null>(null);
	const [pendingInvite, setPendingInvite] = useState<PendingInvite | null>(null);
	const [familyReady, setFamilyReady] = useState(false);

	const clearFamily = useCallback(() => {
		setFamily(null);
		setFamilyMembers([]);
		setFamilyInvites([]);
		setFamilySnapshot(null);
		setPendingInvite(null);
	}, []);

	const reloadFamily = useCallback(async () => {
		setFamilyReady(false);
		try {
			if (!isLoggedIn) {
				clearFamily();
				onUserPatch(NO_FAMILY_PATCH);
				return;
			}

			const snapshot = await getFamilySnapshot(userId ?? undefined);
			setFamilySnapshot(snapshot);
			setFamilyMembers(snapshot.members);
			setFamilyInvites(snapshot.invites);

			if (!snapshot.family || !snapshot.membership) {
				setFamily(null);
				onUserPatch(NO_FAMILY_PATCH);
				setPendingInvite(snapshot.pendingInvite);
				return;
			}

			setPendingInvite(null);

			const nextFamily: FamilyInfo = {
				id: snapshot.family.id,
				nome: snapshot.family.nome,
				ownerUserId: snapshot.family.owner_user_id,
				memberCount: snapshot.members.length,
				role: snapshot.membership.role as "owner" | "member",
			};

			setFamily(nextFamily);
			onUserPatch({
				familyId: nextFamily.id,
				familyRole: nextFamily.role,
				familyName: nextFamily.nome,
			});
		} finally {
			setFamilyReady(true);
		}
	}, [isLoggedIn, userId, onUserPatch, clearFamily]);

	useEffect(() => {
		if (!isLoggedIn) return;
		reloadFamily().catch(() => {
			setFamily(null);
			setFamilyMembers([]);
			setFamilyInvites([]);
			setFamilySnapshot(null);
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isLoggedIn]);

	async function createNewFamily(nome: string) {
		await createFamily(nome);
		await reloadFamily();
	}

	async function sendFamilyInvite(email: string) {
		if (!family?.id) throw new Error("Família não encontrada");
		await inviteFamilyMember(family.id, email);
		await reloadFamily();
	}

	async function cancelFamilyInvite(inviteId: number) {
		await cancelInvite(inviteId);
		await reloadFamily();
	}

	async function removeMemberFromFamily(memberId: number) {
		await removeFamilyMember(memberId);
		await reloadFamily();
	}

	async function transferFamilyOwnership(targetUserId: string) {
		if (!family?.id) throw new Error("Família não encontrada");
		await transferOwnership(family.id, targetUserId);
		await reloadFamily();
	}

	async function leaveCurrentFamily() {
		if (!familySnapshot) throw new Error("Família não encontrada");
		await leaveFamily(familySnapshot);
		await reloadFamily();
	}

	async function deleteCurrentFamily() {
		if (!family?.id) throw new Error("Família não encontrada");
		await deleteFamily(family.id);
		await reloadFamily();
	}

	async function acceptPendingInvite() {
		if (!pendingInvite) throw new Error("Nenhum convite pendente");
		await acceptFamilyInviteById(pendingInvite.id, pendingInvite.family_id);
		await reloadFamily();
	}

	async function declinePendingInvite() {
		if (!pendingInvite) throw new Error("Nenhum convite pendente");
		await declineFamilyInviteById(pendingInvite.id);
		setPendingInvite(null);
	}

	// Chamado no logout: zera tudo, inclusive o familyReady.
	const resetFamilyState = useCallback(() => {
		clearFamily();
		setFamilyReady(false);
	}, [clearFamily]);

	return {
		family,
		familyMembers,
		familyInvites,
		pendingInvite,
		familyReady,
		setFamilyReady,
		reloadFamily,
		resetFamilyState,
		createNewFamily,
		sendFamilyInvite,
		cancelFamilyInvite,
		removeMemberFromFamily,
		transferFamilyOwnership,
		leaveCurrentFamily,
		deleteCurrentFamily,
		acceptPendingInvite,
		declinePendingInvite,
	};
}
