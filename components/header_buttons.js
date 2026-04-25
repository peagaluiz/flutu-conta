import { useAuth } from "@/state/AuthContext";
import { useTheme } from "@/components/ui/gluestack-ui-provider/ThemeProvider/ThemeProvider";
import React from "react"
import { Platform } from "react-native"
import { useRouter } from "expo-router";
import { useDatabase } from "@/services/database/useDatabase";
import { HStack } from "@/components/ui/hstack"
import { Button } from "@/components/ui/button"
import {
    Avatar,
    AvatarFallbackText,
    AvatarImage,
} from "@/components/ui/avatar"
import { useErrorToast } from '@/components/ui/toast/useErrorToast';
import { ProfileEditModal } from "@/components/header/ProfileEditModal";
import { ProfileActionsSheet } from "@/components/header/ProfileActionsSheet";
import { FamilyCreateModal } from "@/components/header/FamilyCreateModal";
import { profileSchema } from "@/components/header/profileValidation";


const HeaderWrapper = ({ navigation, theme }) => {
    const {
        logOut,
        userData,
        family,
        updateUserProfile,
        createNewFamily,
    } = useAuth();
    const router = useRouter();
    const { theme: currentTheme, toggleTheme } = useTheme();
    const { syncAllPendingData } = useDatabase();
    const { showNewToast } = useErrorToast();

    const profileName = userData?.nome?.trim() || "Meu perfil";
    const profileEmail = userData?.email || "";

    const [showActionsheet, setShowActionsheet] = React.useState(false)
    const [showEditModal, setShowEditModal] = React.useState(false)
    const [displayName, setDisplayName] = React.useState('')
    const [displayNameError, setDisplayNameError] = React.useState('')
    const [isSaving, setIsSaving] = React.useState(false)
    const [isSyncing, setIsSyncing] = React.useState(false)
    const [showCreateFamilyModal, setShowCreateFamilyModal] = React.useState(false)
    const [familyName, setFamilyName] = React.useState("")
    const [isSavingFamily, setIsSavingFamily] = React.useState(false)

    const handleClose = () => setShowActionsheet(false)

    const handleEditOpen = () => {
        setDisplayName(userData?.nome || '');
        setDisplayNameError('');
        handleClose();
        setTimeout(() => {
            setShowEditModal(true);
        }, 120);
    }

    const handleSaveProfile = async () => {
        try {
            await profileSchema.validate({ displayName }, { abortEarly: false });
            setDisplayNameError('');
        } catch (validationError) {
            const message = validationError?.errors?.[0] || validationError?.message || 'Nome invalido';
            setDisplayNameError(message);
            showNewToast('error', message);
            return;
        }

        setIsSaving(true);
        try {
            await updateUserProfile(displayName.trim());
            showNewToast('success', 'Perfil atualizado!');
            setShowEditModal(false);
        } catch (error) {
            showNewToast('error', error?.message || 'Erro ao atualizar perfil');
        } finally {
            setIsSaving(false);
        }
    }

    const handleForceSync = async () => {
        handleClose();
        setIsSyncing(true);
        try {
            const result = await syncAllPendingData({ force: true, throwOnError: true });
            const synced = Number(result?.synced || 0);
            showNewToast('success', `Sincronização concluída. ${synced} registro(s) sincronizado(s).`);
        } catch (error) {
            showNewToast('error', error?.message || 'Erro ao sincronizar com o Supabase');
        } finally {
            setIsSyncing(false);
        }
    }

    const handleOpenFamily = () => {
        handleClose();

        if (family?.id) {
            router.push("/(auth)/(stack)/family");
            return;
        }

        setFamilyName("");
        setTimeout(() => {
            setShowCreateFamilyModal(true);
        }, 120);
    }

    const handleCreateFamily = async () => {
        const cleanName = String(familyName || "").trim();
        if (!cleanName) {
            showNewToast("warning", "Informe o nome da família", "Atenção");
            return;
        }

        setIsSavingFamily(true);
        try {
            await createNewFamily(cleanName);
            setShowCreateFamilyModal(false);
            showNewToast("success", "Família criada com sucesso");
            router.push("/(auth)/(stack)/family");
        } catch (error) {
            showNewToast("error", error?.message || "Erro ao criar família");
        } finally {
            setIsSavingFamily(false);
        }
    }

    return (
        <>
            <HStack className="py-0 px-4 justify-start gap-4 items-center" style={{ marginRight: Platform.OS === 'web' ? 16 : 0 }}>
                <Button size="lg" className="h-[30px] w-[30px] rounded-full p-6" onPress={() => setShowActionsheet(true)} accessibilityLabel="Abrir ações do perfil">
                    <Avatar size="md">
                        <AvatarFallbackText>{userData?.email?.charAt(0).toUpperCase() || 'U'}</AvatarFallbackText>
                        {userData?.avatarUrl ? <AvatarImage src={userData.avatarUrl} /> : null}
                    </Avatar>
                </Button>
                <ProfileActionsSheet
                    isOpen={showActionsheet}
                    onClose={handleClose}
                    onEditProfile={handleEditOpen}
                    onSyncNow={handleForceSync}
                    onToggleTheme={() => {
                        toggleTheme();
                        handleClose();
                    }}
                    onOpenFamily={handleOpenFamily}
                    hasFamily={!!family?.id}
                    onLogout={logOut}
                    isSyncing={isSyncing}
                    isDarkMode={currentTheme === 'dark'}
                    profileName={profileName}
                    profileEmail={profileEmail}
                    profileImageUrl={userData?.avatarUrl}
                />
            </HStack>

            <ProfileEditModal
                isOpen={showEditModal}
                value={displayName}
                onChange={(nextValue) => {
                    setDisplayName(nextValue);
                    if (displayNameError) setDisplayNameError('');
                }}
                onClose={() => setShowEditModal(false)}
                onSave={handleSaveProfile}
                isSaving={isSaving}
                errorMessage={displayNameError}
            />

            <FamilyCreateModal
                isOpen={showCreateFamilyModal}
                value={familyName}
                onChange={setFamilyName}
                onClose={() => setShowCreateFamilyModal(false)}
                onSave={handleCreateFamily}
                isSaving={isSavingFamily}
            />
        </>
    );
}

export default function HeaderButtons({ navigation }) {
    return <HeaderWrapper navigation={navigation} />;
}