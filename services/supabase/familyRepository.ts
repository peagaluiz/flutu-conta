import { supabase } from "@/services/supabase/client";

export type FamilyRole = "owner" | "member";

export type FamilyMember = {
    id: number;
    family_id: number;
    user_id: string;
    role: FamilyRole;
    status: string;
    created_at?: string | null;
    user_nome?: string | null;
    user_email?: string | null;
};

export type FamilyInvite = {
    id: number;
    family_id: number;
    email: string;
    status: string;
    invited_by_user_id: string;
    created_at?: string | null;
};

export type FamilyInfo = {
    id: number;
    nome: string;
    owner_user_id: string;
};

export type FamilySnapshot = {
    family: FamilyInfo | null;
    membership: FamilyMember | null;
    members: FamilyMember[];
    invites: FamilyInvite[];
};

export type PendingInvite = {
    id: number;
    family_id: number;
    family_nome: string;
    invited_by_nome: string | null;
    created_at: string | null;
};

async function getCurrentUserId() {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw new Error(error.message || "Falha ao obter usuário");
    const userId = data?.user?.id;
    if (!userId) throw new Error("Usuário não autenticado");
    return userId;
}

export async function getFamilySnapshot(): Promise<FamilySnapshot> {
    const userId = await getCurrentUserId();

    const { data: membershipData, error: membershipError } = await supabase
        .from("familia_membros")
        .select("id, family_id, user_id, role, status, created_at")
        .eq("user_id", userId)
        .eq("status", "active")
        .maybeSingle();

    if (membershipError) throw new Error(membershipError.message || "Falha ao carregar família");

    if (!membershipData?.family_id) {
        return {
            family: null,
            membership: null,
            members: [],
            invites: [],
        };
    }

    const familyId = Number(membershipData.family_id);

    const [{ data: familyData, error: familyError }, { data: membersData, error: membersError }, { data: invitesData, error: invitesError }] =
        await Promise.all([
            supabase
                .from("familias")
                .select("id, nome, owner_user_id")
                .eq("id", familyId)
                .maybeSingle(),
            supabase
                .from("familia_membros")
                .select("id, family_id, user_id, role, status, created_at")
                .eq("family_id", familyId)
                .eq("status", "active")
                .order("created_at", { ascending: true }),
            supabase
                .from("familia_convites")
                .select("id, family_id, email, status, invited_by_user_id, created_at")
                .eq("family_id", familyId)
                .eq("status", "pending")
                .order("created_at", { ascending: false }),
        ]);

    if (familyError) throw new Error(familyError.message || "Falha ao carregar família");
    if (membersError) throw new Error(membersError.message || "Falha ao carregar membros");
    if (invitesError) throw new Error(invitesError.message || "Falha ao carregar convites");

    const members = (membersData ?? []) as FamilyMember[];

    if (members.length > 0) {
        const userIds = members.map((item) => item.user_id);
        const { data: authUsers } = await supabase
            .from("profiles")
            .select("id, nome, email")
            .in("id", userIds);

        const profileById = new Map((authUsers ?? []).map((profile: any) => [profile.id, profile]));

        for (const member of members) {
            const profile = profileById.get(member.user_id);
            member.user_nome = profile?.nome || null;
            member.user_email = profile?.email || null;
        }
    }

    return {
        family: (familyData as FamilyInfo) ?? null,
        membership: (membershipData as FamilyMember) ?? null,
        members,
        invites: (invitesData ?? []) as FamilyInvite[],
    };
}

export async function createFamily(nome: string) {
    const cleanName = String(nome || "").trim();
    if (!cleanName) throw new Error("Informe o nome da família");

    const userId = await getCurrentUserId();

    const { data: existingMembership } = await supabase
        .from("familia_membros")
        .select("id")
        .eq("user_id", userId)
        .eq("status", "active")
        .maybeSingle();

    if (existingMembership?.id) {
        throw new Error("Você já participa de uma família");
    }

    const { data: family, error: familyError } = await supabase
        .from("familias")
        .insert({ nome: cleanName, owner_user_id: userId })
        .select("id, nome, owner_user_id")
        .single();

    if (familyError) throw new Error(familyError.message || "Falha ao criar família");

    const { error: membershipError } = await supabase
        .from("familia_membros")
        .insert({
            family_id: family.id,
            user_id: userId,
            role: "owner",
            status: "active",
        });

    if (membershipError) throw new Error(membershipError.message || "Falha ao vincular criador à família");

    return family as FamilyInfo;
}

export async function inviteFamilyMember(familyId: number, email: string) {
    const cleanEmail = String(email || "").trim().toLowerCase();
    if (!cleanEmail || !/^\S+@\S+\.\S+$/.test(cleanEmail)) {
        throw new Error("Informe um e-mail válido");
    }

    const userId = await getCurrentUserId();

    const { data: existingInvite } = await supabase
        .from("familia_convites")
        .select("id")
        .eq("family_id", familyId)
        .eq("email", cleanEmail)
        .eq("status", "pending")
        .maybeSingle();

    if (existingInvite?.id) {
        throw new Error("Já existe convite pendente para este e-mail");
    }

    const { error } = await supabase.from("familia_convites").insert({
        family_id: familyId,
        email: cleanEmail,
        invited_by_user_id: userId,
        status: "pending",
    });

    if (error) throw new Error(error.message || "Falha ao enviar convite");

    supabase
        .from("familias")
        .select("nome")
        .eq("id", familyId)
        .maybeSingle()
        .then(({ data: familia }) => {
            supabase.functions.invoke("send-family-invite", {
                body: {
                    email: cleanEmail,
                    family_name: familia?.nome ?? String(familyId),
                    invited_by: userId,
                },
            });
        })
        .catch(() => {});
}

export async function cancelInvite(inviteId: number) {
    const { error } = await supabase
        .from("familia_convites")
        .update({ status: "cancelled" })
        .eq("id", inviteId);

    if (error) throw new Error(error.message || "Falha ao cancelar convite");
}

export async function removeFamilyMember(memberId: number) {
    const { error } = await supabase
        .from("familia_membros")
        .update({ status: "removed" })
        .eq("id", memberId);

    if (error) throw new Error(error.message || "Falha ao remover membro");
}

export async function transferOwnership(familyId: number, targetUserId: string) {
    const { error: familyError } = await supabase
        .from("familias")
        .update({ owner_user_id: targetUserId })
        .eq("id", familyId);

    if (familyError) throw new Error(familyError.message || "Falha ao transferir ownership");

    const { error: demoteError } = await supabase
        .from("familia_membros")
        .update({ role: "member" })
        .eq("family_id", familyId)
        .eq("role", "owner");

    if (demoteError) throw new Error(demoteError.message || "Falha ao atualizar papel do owner atual");

    const { error: promoteError } = await supabase
        .from("familia_membros")
        .update({ role: "owner" })
        .eq("family_id", familyId)
        .eq("user_id", targetUserId)
        .eq("status", "active");

    if (promoteError) throw new Error(promoteError.message || "Falha ao promover novo owner");
}

export async function leaveFamily(snapshot: FamilySnapshot) {
    const userId = await getCurrentUserId();
    const familyId = snapshot.family?.id;
    const membershipId = snapshot.membership?.id;

    if (!familyId || !membershipId) throw new Error("Você não participa de família");

    const activeMembers = snapshot.members.filter((item) => item.status === "active");
    const isOwner = snapshot.membership?.role === "owner";

    if (isOwner) {
        if (activeMembers.length > 1) {
            throw new Error("Transfira o ownership antes de sair da família");
        }

        const { error: deleteInvitesError } = await supabase
            .from("familia_convites")
            .update({ status: "cancelled" })
            .eq("family_id", familyId)
            .eq("status", "pending");

        if (deleteInvitesError) throw new Error(deleteInvitesError.message || "Falha ao limpar convites");

        const { error: removeMembershipError } = await supabase
            .from("familia_membros")
            .update({ status: "removed" })
            .eq("id", membershipId);

        if (removeMembershipError) throw new Error(removeMembershipError.message || "Falha ao remover membro");

        const { error: deleteFamilyError } = await supabase
            .from("familias")
            .delete()
            .eq("id", familyId);

        if (deleteFamilyError) throw new Error(deleteFamilyError.message || "Falha ao excluir família");

        return;
    }

    const { error } = await supabase
        .from("familia_membros")
        .update({ status: "removed" })
        .eq("id", membershipId)
        .eq("user_id", userId);

    if (error) throw new Error(error.message || "Falha ao sair da família");
}

export async function getPendingInviteForCurrentUser(): Promise<PendingInvite | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) return null;

    const { data } = await supabase
        .from("familia_convites")
        .select("id, family_id, invited_by_user_id, created_at")
        .eq("email", user.email)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (!data) return null;

    const [{ data: familia }, { data: inviter }] = await Promise.all([
        supabase.from("familias").select("nome").eq("id", data.family_id).maybeSingle(),
        supabase.from("profiles").select("nome, email").eq("id", data.invited_by_user_id).maybeSingle(),
    ]);

    return {
        id: data.id,
        family_id: data.family_id,
        family_nome: familia?.nome ?? "Família",
        invited_by_nome: (inviter as any)?.nome ?? (inviter as any)?.email ?? null,
        created_at: data.created_at ?? null,
    };
}

export async function acceptFamilyInviteById(inviteId: number, familyId: number) {
    const userId = await getCurrentUserId();

    const { data: existing } = await supabase
        .from("familia_membros")
        .select("id")
        .eq("user_id", userId)
        .eq("status", "active")
        .maybeSingle();

    if (existing?.id) throw new Error("Você já participa de uma família");

    const { error: memberError } = await supabase
        .from("familia_membros")
        .insert({ family_id: familyId, user_id: userId, role: "member", status: "active" });

    if (memberError) throw new Error(memberError.message || "Falha ao entrar na família");

    await supabase.from("familia_convites").update({ status: "accepted" }).eq("id", inviteId);
}

export async function declineFamilyInviteById(inviteId: number) {
    const { error } = await supabase
        .from("familia_convites")
        .update({ status: "cancelled" })
        .eq("id", inviteId);

    if (error) throw new Error(error.message || "Falha ao recusar convite");
}

export async function deleteFamily(familyId: number) {
    const { error: invitesError } = await supabase
        .from("familia_convites")
        .update({ status: "cancelled" })
        .eq("family_id", familyId)
        .eq("status", "pending");

    if (invitesError) throw new Error(invitesError.message || "Falha ao cancelar convites");

    const { error: membersError } = await supabase
        .from("familia_membros")
        .update({ status: "removed" })
        .eq("family_id", familyId)
        .eq("status", "active");

    if (membersError) throw new Error(membersError.message || "Falha ao remover membros");

    const { error: familyError } = await supabase.from("familias").delete().eq("id", familyId);
    if (familyError) throw new Error(familyError.message || "Falha ao excluir família");
}
