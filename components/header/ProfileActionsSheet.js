import React from "react";
import { LogOut, MoonStar, PencilLine, RefreshCw, Sun, Users } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Box } from "@/components/ui/box";
import { Text } from "@/components/ui/text";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { Pressable } from "@/components/ui/pressable";
import {
  Avatar,
  AvatarFallbackText,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  Actionsheet,
  ActionsheetBackdrop,
  ActionsheetContent,
  ActionsheetItem,
  ActionsheetItemText,
  ActionsheetIcon,
} from "@/components/ui/actionsheet";

export function ProfileActionsSheet({
  isOpen,
  onClose,
  onEditProfile,
  onSyncNow,
  onToggleTheme,
  onLogout,
  onOpenFamily,
  hasFamily,
  isSyncing,
  isDarkMode,
  profileName,
  profileEmail,
  profileImageUrl,
}) {
  const insets = useSafeAreaInsets();
  const avatarFallback = profileName?.trim()?.[0]?.toUpperCase() || profileEmail?.trim()?.[0]?.toUpperCase() || "U";
  const contentBottomPadding = insets.bottom + 24;

  return (
    <Actionsheet isOpen={isOpen} onClose={onClose}>
      <ActionsheetBackdrop />
      <ActionsheetContent className="items-stretch px-4 pt-3" style={{ paddingBottom: contentBottomPadding }}>
        <VStack className="w-full items-stretch rounded-3xl bg-background-50 px-5 py-5 mb-4">
          <HStack className="items-start gap-3">
            <Avatar size="lg" className="border-2 border-outline-100">
              <AvatarFallbackText>{avatarFallback}</AvatarFallbackText>
              {profileImageUrl ? <AvatarImage src={profileImageUrl} /> : null}
            </Avatar>

            <VStack className="flex-1 items-start">
              <HStack className="w-full items-center justify-between gap-3">
                <Text size="lg" bold className="flex-1 text-left text-typography-900">
                  {profileName || "Meu perfil"}
                </Text>

                <Pressable onPress={onEditProfile} accessibilityRole="button" accessibilityLabel="Editar perfil">
                  <Box className="h-8 min-w-8 items-center justify-center rounded-xl bg-secondary-500 px-2">
                    <PencilLine size={15} color="#FFFFFF" />
                  </Box>
                </Pressable>
              </HStack>

              {profileEmail ? (
                <Text size="sm" className="mt-1 text-left text-typography-500">
                  {profileEmail}
                </Text>
              ) : null}
            </VStack>
          </HStack>
        </VStack>

        <ActionsheetItem
          className="my-2 rounded-2xl"
          onPress={onSyncNow}
          disabled={isSyncing}
        >
          <ActionsheetIcon size="lg" className="stroke-background-700" as={RefreshCw} />
          <ActionsheetItemText size="lg">
            {isSyncing ? "Sincronizando..." : "Sincronizar agora"}
          </ActionsheetItemText>
        </ActionsheetItem>

        <ActionsheetItem className="my-2 rounded-2xl" onPress={onToggleTheme}>
          <ActionsheetIcon size="lg" className="stroke-background-700" as={isDarkMode ? Sun : MoonStar} />
          <ActionsheetItemText size="lg">
            {isDarkMode ? "Ativar modo claro" : "Ativar modo escuro"}
          </ActionsheetItemText>
        </ActionsheetItem>

        <ActionsheetItem className="my-2 rounded-2xl" onPress={onOpenFamily}>
          <ActionsheetIcon size="lg" className="stroke-background-700" as={Users} />
          <ActionsheetItemText size="lg">
            {hasFamily ? "Gerenciar família" : "Criar família"}
          </ActionsheetItemText>
        </ActionsheetItem>

        <ActionsheetItem className="my-2 rounded-2xl" onPress={onLogout}>
          <ActionsheetIcon size="lg" className="stroke-background-700" as={LogOut} />
          <ActionsheetItemText size="lg" className="text-error-600">
            Sair
          </ActionsheetItemText>
        </ActionsheetItem>
      </ActionsheetContent>
    </Actionsheet>
  );
}
