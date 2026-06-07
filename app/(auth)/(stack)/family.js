import React from "react";
import { ScrollView } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronLeft } from "lucide-react-native";
import { useTheme } from "@/components/ui/gluestack-ui-provider/ThemeProvider/ThemeProvider";
import { getThemeColors } from "@/constants/colors";
import { Pressable } from "@/components/ui/pressable";
import { FamilyCreateModal } from "@/components/header/FamilyCreateModal";
import { useFamilyManagement } from "@/hooks/useFamilyManagement";
import { PendingInviteView } from "@/components/family/PendingInviteView";
import { FamilyEmptyState } from "@/components/family/FamilyEmptyState";
import { FamilyInfoCard } from "@/components/family/FamilyInfoCard";
import { FamilyMembersList } from "@/components/family/FamilyMembersList";
import { FamilyInvitesSection } from "@/components/family/FamilyInvitesSection";
import { FamilyActionsSection } from "@/components/family/FamilyActionsSection";

function BackButton({ isDarkMode }) {
	const router = useRouter();
	return (
		<Pressable onPress={() => router.back()} style={{ paddingLeft: 8, paddingRight: 4 }}>
			<ChevronLeft size={24} color={isDarkMode ? "#F8FAFC" : "#0F172A"} />
		</Pressable>
	);
}

export default function FamilyManagementScreen() {
	const insets = useSafeAreaInsets();
	const { theme } = useTheme();
	const colors = getThemeColors(theme);
	const isDarkMode = theme === "dark";

	const {
		family,
		familyMembers,
		familyInvites,
		pendingInvite,
		currentUserId,
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
	} = useFamilyManagement();

	const scrollProps = {
		style: { backgroundColor: colors.screen },
		contentContainerStyle: {
			padding: 16,
			gap: 12,
			paddingBottom: insets.bottom + 32,
		},
	};

	const headerLeft = () => <BackButton isDarkMode={isDarkMode} />;
	const headerBase = { headerLeft, headerTitleAlign: "center", headerTitleContainerStyle: { marginLeft: 0, paddingLeft: 0 } };

	if (!family && pendingInvite) {
		return (
			<ScrollView {...scrollProps}>
				<Stack.Screen options={{ title: "Convite de família", ...headerBase }} />
				<PendingInviteView
					colors={colors}
					pendingInvite={pendingInvite}
					acceptingInvite={acceptingInvite}
					decliningInvite={decliningInvite}
					onAccept={handleAcceptInvite}
					onDecline={handleDeclineInvite}
				/>
			</ScrollView>
		);
	}

	if (!family) {
		return (
			<ScrollView {...scrollProps}>
				<Stack.Screen options={{ title: "Família", ...headerBase }} />
				<FamilyEmptyState colors={colors} onCreatePress={() => setCreateModalOpen(true)} />
				<FamilyCreateModal
					isOpen={createModalOpen}
					value={newFamilyName}
					onChange={setNewFamilyName}
					onClose={() => {
						setCreateModalOpen(false);
						setNewFamilyName("");
					}}
					onSave={handleCreateFamily}
					isSaving={creatingFamily}
				/>
			</ScrollView>
		);
	}

	return (
		<ScrollView {...scrollProps}>
			<Stack.Screen options={{ title: "Gerenciar família", ...headerBase }} />
			<FamilyInfoCard colors={colors} family={family} ownerName={ownerName} />
			<FamilyMembersList
				colors={colors}
				members={familyMembers}
				isOwner={isOwner}
				currentUserId={currentUserId}
				getMemberName={getMemberName}
				getMemberEmail={getMemberEmail}
				onRemove={confirmRemoveMember}
				onTransferOwnership={confirmTransferOwnership}
			/>
			{isOwner && (
				<FamilyInvitesSection
					colors={colors}
					inviteEmail={inviteEmail}
					onChangeEmail={setInviteEmail}
					onInvite={handleInvite}
					savingInvite={savingInvite}
					invites={familyInvites}
					onCancelInvite={confirmCancelInvite}
				/>
			)}
			<FamilyActionsSection
				colors={colors}
				isOwner={isOwner}
				onDelete={confirmDeleteFamily}
				onLeave={confirmLeaveFamily}
			/>
		</ScrollView>
	);
}
