import { View } from "react-native";
import { FamilyCreateModal } from "@/components/header/FamilyCreateModal";
import { PendingInviteView } from "@/components/family/PendingInviteView";
import { FamilyEmptyState } from "@/components/family/FamilyEmptyState";
import { FamilyInfoCard } from "@/components/family/FamilyInfoCard";
import { FamilyMembersList } from "@/components/family/FamilyMembersList";
import { FamilyInvitesSection } from "@/components/family/FamilyInvitesSection";
import { FamilyActionsSection } from "@/components/family/FamilyActionsSection";

// Título conforme o estado — usado tanto no header da rota quanto no do modal.
export function getFamilyTitle(fm) {
	if (!fm.family && fm.pendingInvite) return "Convite de família";
	if (!fm.family) return "Família";
	return "Gerenciar família";
}

// Corpo apresentacional de gerenciar família (os 3 estados), sem ScrollView nem
// header — o container (rota em pilha ou modal) cuida de scroll e título.
export function FamilyManagementView({ fm, colors, contentStyle }) {
	const containerStyle = [{ padding: 16, gap: 12 }, contentStyle];

	if (!fm.family && fm.pendingInvite) {
		return (
			<View style={containerStyle}>
				<PendingInviteView
					colors={colors}
					pendingInvite={fm.pendingInvite}
					acceptingInvite={fm.acceptingInvite}
					decliningInvite={fm.decliningInvite}
					onAccept={fm.handleAcceptInvite}
					onDecline={fm.handleDeclineInvite}
				/>
			</View>
		);
	}

	if (!fm.family) {
		return (
			<View style={containerStyle}>
				<FamilyEmptyState colors={colors} onCreatePress={() => fm.setCreateModalOpen(true)} />
				<FamilyCreateModal
					isOpen={fm.createModalOpen}
					value={fm.newFamilyName}
					onChange={fm.setNewFamilyName}
					onClose={() => {
						fm.setCreateModalOpen(false);
						fm.setNewFamilyName("");
					}}
					onSave={fm.handleCreateFamily}
					isSaving={fm.creatingFamily}
				/>
			</View>
		);
	}

	return (
		<View style={containerStyle}>
			<FamilyInfoCard colors={colors} family={fm.family} ownerName={fm.ownerName} />
			<FamilyMembersList
				colors={colors}
				members={fm.familyMembers}
				isOwner={fm.isOwner}
				currentUserId={fm.currentUserId}
				getMemberName={fm.getMemberName}
				getMemberEmail={fm.getMemberEmail}
				onRemove={fm.confirmRemoveMember}
				onTransferOwnership={fm.confirmTransferOwnership}
			/>
			{fm.isOwner && (
				<FamilyInvitesSection
					colors={colors}
					inviteEmail={fm.inviteEmail}
					onChangeEmail={fm.setInviteEmail}
					onInvite={fm.handleInvite}
					savingInvite={fm.savingInvite}
					invites={fm.familyInvites}
					onCancelInvite={fm.confirmCancelInvite}
				/>
			)}
			<FamilyActionsSection
				colors={colors}
				isOwner={fm.isOwner}
				onDelete={fm.confirmDeleteFamily}
				onLeave={fm.confirmLeaveFamily}
			/>
		</View>
	);
}
