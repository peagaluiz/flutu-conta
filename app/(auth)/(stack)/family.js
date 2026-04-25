import React, { useMemo, useState } from "react";
import { Alert, ScrollView } from "react-native";
import { Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Crown, Trash2, UserMinus, Users } from "lucide-react-native";
import { useTheme } from "@/components/ui/gluestack-ui-provider/ThemeProvider/ThemeProvider";
import { getThemeColors } from "@/constants/colors";
import { useAuth } from "@/state/AuthContext";
import { useErrorToast } from "@/components/ui/toast/useErrorToast";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { Text } from "@/components/ui/text";
import { Input, InputField } from "@/components/ui/input";
import { Button, ButtonIcon, ButtonText } from "@/components/ui/button";
import { Pressable } from "@/components/ui/pressable";

export default function FamilyManagementScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const colors = getThemeColors(theme);
  const { showNewToast } = useErrorToast();
  const {
    userData,
    family,
    familyMembers,
    familyInvites,
    reloadFamily,
    sendFamilyInvite,
    cancelFamilyInvite,
    removeMemberFromFamily,
    transferFamilyOwnership,
    leaveCurrentFamily,
    deleteCurrentFamily,
  } = useAuth();

  const [inviteEmail, setInviteEmail] = useState("");
  const [savingInvite, setSavingInvite] = useState(false);

  const isOwner = family?.role === "owner";

  const ownerMember = useMemo(
    () => familyMembers.find((member) => member.role === "owner"),
    [familyMembers]
  );

  const getMemberName = (member) => {
    if (member?.user_nome) return member.user_nome;
    if (member?.user_id === userData?.id) return userData?.nome || userData?.email || member.user_id;
    return member?.user_email || member?.user_id;
  };

  const getMemberEmail = (member) => {
    if (member?.user_email) return member.user_email;
    if (member?.user_id === userData?.id) return userData?.email || "Sem e-mail";
    return "Sem e-mail";
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
    Alert.alert("Remover membro", `Remover ${member.user_nome || member.user_email || "membro"} da família?`, [
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
    Alert.alert("Transferir ownership", `Deseja tornar ${member.user_nome || member.user_email || "membro"} o novo owner?`, [
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
    Alert.alert("Excluir família", "Esta ação remove a família e os vínculos de todos os membros. Continuar?", [
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
    ]);
  };

  if (!family) {
    return (
      <ScrollView style={{ backgroundColor: colors.screen }} contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}>
        <Stack.Screen
          options={{
            title: "Gerenciar família",
            headerBackVisible: true,
            headerBackTitleVisible: false,
            headerBackButtonDisplayMode: "minimal",
            headerTitleAlign: "center",
            headerLeftContainerStyle: {
              marginLeft: 0,
              paddingLeft: 0,
              width: 44,
            },
            headerTitleContainerStyle: {
              marginLeft: 0,
              paddingLeft: 0,
            },
          }}
        />
        <Box className="rounded-2xl border p-4" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
          <Text style={{ color: colors.textPrimary }}>Você ainda não participa de uma família.</Text>
          <Button className="mt-3" onPress={reloadFamily}>
            <ButtonText>Atualizar</ButtonText>
          </Button>
        </Box>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: colors.screen }} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 32 }}>
      <Stack.Screen
        options={{
          title: "Gerenciar família",
          headerBackVisible: true,
          headerBackTitleVisible: false,
          headerBackButtonDisplayMode: "minimal",
          headerTitleAlign: "center",
          headerLeftContainerStyle: {
            marginLeft: 0,
            paddingLeft: 0,
            width: 44,
          },
          headerTitleContainerStyle: {
            marginLeft: 0,
            paddingLeft: 0,
          },
        }}
      />

      <Box className="rounded-2xl border p-4" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
        <VStack className="gap-1">
          <Text className="text-lg font-semibold" style={{ color: colors.textPrimary }}>{family.nome}</Text>
          <Text style={{ color: colors.textSecondary }}>{family.memberCount} membro(s)</Text>
          <Text style={{ color: colors.textSecondary }}>
            Owner: {ownerMember ? getMemberName(ownerMember) : "-"}
          </Text>
        </VStack>
      </Box>

      <Box className="rounded-2xl border p-4" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
        <Text className="mb-3 text-base font-semibold" style={{ color: colors.textPrimary }}>Membros</Text>
        <VStack className="gap-2">
          {familyMembers.map((member) => {
            const isMe = member.user_id === userData?.id;
            const memberIsOwner = member.role === "owner";

            return (
              <Box key={String(member.id)} className="rounded-xl border px-3 py-2" style={{ borderColor: colors.border }}>
                <HStack className="items-center justify-between gap-2">
                  <VStack className="flex-1">
                    <Text className="font-semibold" style={{ color: colors.textPrimary }}>
                      {getMemberName(member)}
                    </Text>
                    <Text size="sm" style={{ color: colors.textSecondary }}>
                      {getMemberEmail(member)} {isMe ? "• Você" : ""}
                    </Text>
                  </VStack>

                  <HStack className="items-center gap-2">
                    {memberIsOwner ? <Crown size={16} color={colors.textPrimary} /> : null}

                    {isOwner && !memberIsOwner ? (
                      <Pressable onPress={() => confirmRemoveMember(member)}>
                        <UserMinus size={16} color={colors.dangerText} />
                      </Pressable>
                    ) : null}
                  </HStack>
                </HStack>

                {isOwner && !memberIsOwner ? (
                  <Button className="mt-2 self-start" size="sm" variant="outline" onPress={() => confirmTransferOwnership(member)}>
                    <ButtonText>Transferir ownership</ButtonText>
                  </Button>
                ) : null}
              </Box>
            );
          })}
        </VStack>
      </Box>

      {isOwner ? (
        <Box className="rounded-2xl border p-4" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
          <Text className="mb-3 text-base font-semibold" style={{ color: colors.textPrimary }}>Convites por e-mail</Text>

          <HStack className="items-center gap-2">
            <Input className="flex-1">
              <InputField
                value={inviteEmail}
                onChangeText={setInviteEmail}
                placeholder="email@exemplo.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </Input>
            <Button onPress={handleInvite} isDisabled={savingInvite}>
              <ButtonText>{savingInvite ? "Enviando..." : "Convidar"}</ButtonText>
            </Button>
          </HStack>

          <Text className="mt-4 mb-2 text-sm font-semibold" style={{ color: colors.textPrimary }}>Convites pendentes</Text>
          <VStack className="gap-2">
            {familyInvites.length === 0 ? (
              <Text style={{ color: colors.textSecondary }}>Nenhum convite pendente.</Text>
            ) : (
              familyInvites.map((invite) => (
                <HStack
                  key={String(invite.id)}
                  className="items-center justify-between rounded-xl border px-3 py-2"
                  style={{ borderColor: colors.border }}
                >
                  <Text style={{ color: colors.textPrimary }}>{invite.email}</Text>
                  <Button size="sm" variant="outline" action="negative" onPress={() => confirmCancelInvite(invite.id)}>
                    <ButtonText>Cancelar</ButtonText>
                  </Button>
                </HStack>
              ))
            )}
          </VStack>
        </Box>
      ) : null}

      <Box className="rounded-2xl border p-4" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
        <Text className="mb-3 text-base font-semibold" style={{ color: colors.textPrimary }}>Ações</Text>

        {isOwner ? (
          <Button action="negative" onPress={confirmDeleteFamily}>
            <ButtonIcon as={Trash2} />
            <ButtonText>Excluir família</ButtonText>
          </Button>
        ) : (
          <Button action="secondary" variant="outline" onPress={confirmLeaveFamily}>
            <ButtonIcon as={Users} />
            <ButtonText>Sair da família</ButtonText>
          </Button>
        )}
      </Box>
    </ScrollView>
  );
}
