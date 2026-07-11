import { useAuth } from "@/state/AuthContext";
import { useTheme } from "@/components/ui/gluestack-ui-provider/ThemeProvider/ThemeProvider";
import { useSyncProgress } from "@/state/SyncProgressContext";
import React from "react";
import { Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { useDatabase } from "@/hooks/useDatabase";
import { useOpenFamily } from "@/hooks/useOpenFamily";
import { HStack } from "@/components/ui/hstack";
import { Button } from "@/components/ui/button";
import {
	Avatar,
	AvatarFallbackText,
	AvatarImage,
} from "@/components/ui/avatar";
import { useErrorToast } from "@/components/ui/toast/useErrorToast";
import { ProfileEditModal } from "@/components/header/ProfileEditModal";
import { ProfileActionsSheet } from "@/components/header/ProfileActionsSheet";
import { FamilyCreateModal } from "@/components/header/FamilyCreateModal";
import { profileSchema } from "@/components/header/profileValidation";

const HeaderWrapper = ({ navigation, theme }) => {
	const { logOut, userData, family, updateUserProfile, updateUserAvatar, removeUserAvatar, createNewFamily } =
		useAuth();
	const openFamily = useOpenFamily();
	const { theme: currentTheme, toggleTheme } = useTheme();
	const { syncAllPendingData } = useDatabase();
	const { showNewToast } = useErrorToast();
	const { startSync, endSync, updateStep } = useSyncProgress();

	const profileName = userData?.nome?.trim() || "Meu perfil";
	const profileEmail = userData?.email || "";

	const [showActionsheet, setShowActionsheet] = React.useState(false);
	const [showEditModal, setShowEditModal] = React.useState(false);
	const [displayName, setDisplayName] = React.useState("");
	const [displayNameError, setDisplayNameError] = React.useState("");
	const [isSaving, setIsSaving] = React.useState(false);
	const [isSyncing, setIsSyncing] = React.useState(false);
	const [isUploadingPhoto, setIsUploadingPhoto] = React.useState(false);
	const [isRemovingPhoto, setIsRemovingPhoto] = React.useState(false);
	const [showCreateFamilyModal, setShowCreateFamilyModal] =
		React.useState(false);
	const [familyName, setFamilyName] = React.useState("");
	const [isSavingFamily, setIsSavingFamily] = React.useState(false);

	const handleClose = () => setShowActionsheet(false);

	const handleEditOpen = () => {
		setDisplayName(userData?.nome || "");
		setDisplayNameError("");
		handleClose();
		setTimeout(() => {
			setShowEditModal(true);
		}, 120);
	};

	const handleSaveProfile = async () => {
		try {
			await profileSchema.validate(
				{ displayName },
				{ abortEarly: false }
			);
			setDisplayNameError("");
		} catch (validationError) {
			const message =
				validationError?.errors?.[0] ||
				validationError?.message ||
				"Nome invalido";
			setDisplayNameError(message);
			showNewToast("error", message);
			return;
		}

		setIsSaving(true);
		try {
			await updateUserProfile(displayName.trim());
			showNewToast("success", "Perfil atualizado!");
			setShowEditModal(false);
		} catch (error) {
			showNewToast("error", error?.message || "Erro ao atualizar perfil");
		} finally {
			setIsSaving(false);
		}
	};

	const handleForceSync = async () => {
		handleClose();
		setIsSyncing(true);
		startSync("Sincronizando dados...");
		try {
			await syncAllPendingData({ force: true, onProgress: updateStep });
		} catch (error) {
			showNewToast(
				"error",
				error?.message || "Erro ao sincronizar com o Supabase"
			);
		} finally {
			setIsSyncing(false);
			endSync();
		}
	};

	const handleUploadPhoto = async () => {
		const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
		if (status !== "granted") {
			showNewToast("warning", "Permissão para acessar a galeria é necessária");
			return;
		}

		const result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ["images"],
			allowsEditing: true,
			aspect: [1, 1],
			quality: 1,
		});

		if (result.canceled) return;

		const asset = result.assets[0];

		// No Android o picker pode retornar a URI original sem crop aplicado.
		// ImageManipulator garante que o arquivo final é quadrado e salvo em disco.
		const actions = [];
		if (asset.width !== asset.height) {
			const size = Math.min(asset.width, asset.height);
			actions.push({
				crop: {
					originX: Math.floor((asset.width - size) / 2),
					originY: Math.floor((asset.height - size) / 2),
					width: size,
					height: size,
				},
			});
		}
		actions.push({ resize: { width: 400, height: 400 } });

		const manipulated = await ImageManipulator.manipulateAsync(
			asset.uri,
			actions,
			{ compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: true }
		);

		// Na web o base64 pode vir como data URI completo
		const base64 = manipulated.base64?.replace(/^data:.*?;base64,/, "");
		if (!base64) {
			showNewToast("error", "Não foi possível processar a imagem");
			return;
		}

		setIsUploadingPhoto(true);
		try {
			await updateUserAvatar(base64, "image/jpeg");
			showNewToast("success", "Foto atualizada!");
		} catch (error) {
			showNewToast("error", error?.message || "Erro ao atualizar foto");
		} finally {
			setIsUploadingPhoto(false);
		}
	};

	const handleRemovePhoto = async () => {
		setIsRemovingPhoto(true);
		try {
			await removeUserAvatar();
			showNewToast("success", "Foto removida!");
		} catch (error) {
			showNewToast("error", error?.message || "Erro ao remover foto");
		} finally {
			setIsRemovingPhoto(false);
		}
	};

	const handleOpenFamily = () => {
		handleClose();

		if (family?.id) {
			openFamily();
			return;
		}

		setFamilyName("");
		setTimeout(() => {
			setShowCreateFamilyModal(true);
		}, 120);
	};

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
			openFamily();
		} catch (error) {
			showNewToast("error", error?.message || "Erro ao criar família");
		} finally {
			setIsSavingFamily(false);
		}
	};

	return (
		<>
			<HStack
				className="py-0 px-4 justify-start gap-4 items-center"
				style={{ marginRight: Platform.OS === "web" ? 16 : 0 }}
			>
				<Button
					size="lg"
					className="h-[30px] w-[30px] rounded-full p-6"
					onPress={() => setShowActionsheet(true)}
					accessibilityLabel="Abrir ações do perfil"
				>
					<Avatar size="md" className="border-2 border-outline-100">
						<AvatarFallbackText>
							{userData?.nome?.trim()?.[0]?.toUpperCase() ||
								userData?.email?.charAt(0).toUpperCase() ||
								"U"}
						</AvatarFallbackText>
						{userData?.avatarUrl ? (
							<AvatarImage source={{ uri: userData.avatarUrl }} />
						) : null}
					</Avatar>
				</Button>
				<ProfileActionsSheet
					isOpen={showActionsheet}
					onClose={handleClose}
					onEditProfile={handleEditOpen}
					onUploadPhoto={handleUploadPhoto}
					onRemovePhoto={handleRemovePhoto}
					onSyncNow={handleForceSync}
					onToggleTheme={() => {
						toggleTheme();
						handleClose();
					}}
					onOpenFamily={handleOpenFamily}
					hasFamily={!!family?.id}
					onLogout={logOut}
					isSyncing={isSyncing}
					isUploadingPhoto={isUploadingPhoto}
					isRemovingPhoto={isRemovingPhoto}
					isDarkMode={currentTheme === "dark"}
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
					if (displayNameError) setDisplayNameError("");
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
};

export default function HeaderButtons({ navigation }) {
	return <HeaderWrapper navigation={navigation} />;
}
