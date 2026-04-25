import { useEffect, useMemo, useRef, useState } from "react";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import Animated, { FadeIn } from "react-native-reanimated";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/components/ui/gluestack-ui-provider/ThemeProvider/ThemeProvider";
import { getThemeColors } from "@/constants/colors";

import { yupResolver } from "@hookform/resolvers/yup";
import { useForm } from "react-hook-form";

import { useDatabase } from "@/services/database/useDatabase";
import { useErrorToast } from "@/components/ui/toast/useErrorToast";
import { useAuth } from "@/state/AuthContext";

import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Box } from "@/components/ui/box";
import { Button, ButtonIcon, ButtonText } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RecurrenceSection } from "@/components/finance/insert/RecurrenceSection";
import { Save } from "lucide-react-native";
import {
  decimalMask,
  categorias,
  formatDateDisplay,
  formatValueForInput,
  insertSchema,
  normalizeDate,
  parseBrNumber,
  parseDateValue,
  toISODate,
} from "@/components/finance/insert/insertFormConfig";
import { TransacaoMainSection } from "@/components/finance/insert/TransacaoMainSection";
import { ObservacaoSection } from "@/components/finance/insert/ObservacaoSection";

function InsertFormSkeleton({ isDarkMode }) {
  const blockStyle = {
    backgroundColor: isDarkMode ? "#1C1C1E" : "#FFFFFF",
    borderColor: isDarkMode ? "rgba(255,255,255,0.10)" : "#E2E8F0",
  };

  return (
    <VStack className="gap-4 p-3">
      <Box className="w-full rounded-md border p-5" style={blockStyle}>
        <VStack className="gap-3">
          <Skeleton className="h-6 w-52 rounded-md" />
          <Skeleton className="h-4 w-36 rounded-sm" />
          <Skeleton className="h-11 w-full rounded-md" />
          <Skeleton className="h-4 w-24 rounded-sm" />
          <Skeleton className="h-11 w-full rounded-md" />
          <Skeleton className="h-4 w-20 rounded-sm" />
          <Skeleton className="h-10 w-full rounded-md" />
          <Skeleton className="h-4 w-28 rounded-sm" />
          <Skeleton className="h-10 w-full rounded-md" />
          <Skeleton className="h-4 w-32 rounded-sm" />
          <Skeleton className="h-10 w-full rounded-md" />
        </VStack>
      </Box>

      <Box className="w-full rounded-md border p-5" style={blockStyle}>
        <VStack className="gap-2">
          <Skeleton className="h-4 w-24 rounded-sm" />
          <Skeleton className="h-28 w-full rounded-md" />
        </VStack>
      </Box>

      <HStack className="w-full justify-end" space="md">
        <Skeleton className="h-11 w-28 rounded-md" />
        <Skeleton className="h-11 w-32 rounded-md" />
      </HStack>
    </VStack>
  );
}

export default function Insert() {
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const isDarkMode = theme === "dark";
  const themeColors = getThemeColors(theme);
  const database = useDatabase();
  const {
    createTransacao,
    createRecurringTransacoes,
    updateTransacao,
    getTransacao,
    getPessoasSuggestions,
    findPessoaByName,
  } = database;
  const { showNewToast } = useErrorToast();
  const { userData, family } = useAuth();

  const rawId = params?.id_transacao;
  const editId = useMemo(() => {
    if (!rawId) return null;
    const value = Array.isArray(rawId) ? rawId[0] : rawId;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }, [rawId]);

  const tipoParam = useMemo(() => {
    const rawValue = params?.tipo;
    const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;
    return value === "receber" || value === "pagar" ? value : null;
  }, [params?.tipo]);

  const categoriaParam = useMemo(() => {
    const rawValue = params?.categoria;
    const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;
    return typeof value === "string" && value.trim() ? value.trim() : null;
  }, [params?.categoria]);

  const dataVencimentoParam = useMemo(() => {
    const rawValue = params?.data_vencimento;
    const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;
    return normalizeDate(value);
  }, [params?.data_vencimento]);

  const isEditMode = !!editId;

  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showRecurrenceEndPicker, setShowRecurrenceEndPicker] = useState(false);
  const [showCategorySheet, setShowCategorySheet] = useState(false);
  const [pessoaSuggestions, setPessoaSuggestions] = useState([]);
  const [isPessoaFocused, setIsPessoaFocused] = useState(false);
  const [isBooting, setIsBooting] = useState(true);
  const [isFromRecurrence, setIsFromRecurrence] = useState(false);
  const [recurrenceMeta, setRecurrenceMeta] = useState(null);
  const pessoaBlurTimeoutRef = useRef(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm({
    resolver: yupResolver(insertSchema),
    defaultValues: {
      tipo: "pagar",
      status: "pendente",
      recurrence_mode: "unica",
      recurrence_frequency: "mensal",
      recurrence_end_date: "",
      recurrence_interval_days: "",
      descricao: "",
      valor: "",
      categoria: "",
      pessoa: "",
      data_vencimento: toISODate(new Date()),
      observacao: "",
      share_with_family: false,
    },
  });

  const dataVencimento = watch("data_vencimento");
  const categoriaAtual = watch("categoria");
  const pessoaAtual = watch("pessoa");
  const recurrenceMode = watch("recurrence_mode");
  const shareWithFamily = watch("share_with_family");
  const recurrenceFrequency = watch("recurrence_frequency");
  const recurrenceFrequencyLabel =
    recurrenceFrequency === "semanal"
      ? "Semanal"
      : recurrenceFrequency === "anual"
        ? "Anual"
        : recurrenceFrequency === "dias"
          ? "Personalizada por dias"
          : "Mensal";
  const actionSheetContentStyle = useMemo(
    () => ({ paddingBottom: Math.max(insets.bottom, 12) + 8 }),
    [insets.bottom]
  );
  const shouldShowSkeleton = isLoading || isBooting;
  const handleBack = () => router.replace("/");

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsBooting(false);
    }, 350);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    return () => {
      if (pessoaBlurTimeoutRef.current) {
        clearTimeout(pessoaBlurTimeoutRef.current);
        pessoaBlurTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    let active = true;

    const loadPessoaSuggestions = async () => {
      const search = (pessoaAtual || "").trim();
      if (!isPessoaFocused || search.length < 3) {
        if (active) setPessoaSuggestions([]);
        return;
      }

      try {
        const suggestions = await getPessoasSuggestions(search, 8);
        if (active) {
          const current = search.toLowerCase();
          const filtered = (suggestions || []).filter(
            (name) => name && name.trim().toLowerCase() !== current
          );
          setPessoaSuggestions(filtered);
        }
      } catch {
        if (active) setPessoaSuggestions([]);
      }
    };

    loadPessoaSuggestions();

    return () => {
      active = false;
    };
  }, [pessoaAtual, isPessoaFocused]);

  useEffect(() => {
    async function loadTransacao() {
      if (!editId) {
        setIsFromRecurrence(false);
        setRecurrenceMeta(null);
        return;
      }

      try {
        setIsLoading(true);
        const transacao = await getTransacao(editId, { fallbackRemoteOnMiss: true });

        if (!transacao) {
          showNewToast("warning", "Lançamento não encontrado.", "Atenção");
          router.replace("/");
          return;
        }

        reset({
          tipo: transacao.tipo ?? "pagar",
          status: transacao.status ?? "pendente",
          recurrence_mode: "unica",
          recurrence_frequency: "mensal",
          recurrence_end_date: "",
          recurrence_interval_days: "",
          descricao: (() => {
            try {
              const parsedJson = transacao.json ? JSON.parse(transacao.json) : null;
              return typeof parsedJson?.descricao === "string" ? parsedJson.descricao : "";
            } catch {
              return "";
            }
          })(),
          valor: formatValueForInput(transacao.valor),
          categoria: transacao.categoria ?? "",
          pessoa: transacao.pessoa ?? "",
          data_vencimento: transacao.data_vencimento ?? "",
          observacao: transacao.observacao ?? "",
          share_with_family: Number(transacao.is_family_shared || 0) === 1,
        });

        setIsFromRecurrence(Number(transacao?.is_from_recurrence || 0) === 1);
        setRecurrenceMeta({
          recurrence_uuid: transacao?.recurrence_uuid || null,
          recurrence_frequency: transacao?.recurrence_frequency || null,
          recurrence_sequence: transacao?.recurrence_sequence || null,
        });
      } catch (error) {
        showNewToast("error", String(error || "Falha ao carregar lançamento"), "Erro");
        router.replace("/");
      } finally {
        setIsLoading(false);
      }
    }

    loadTransacao();
  }, [editId, getTransacao, reset, router, showNewToast]);

  useEffect(() => {
    if (editId) return;

    if (tipoParam) {
      setValue("tipo", tipoParam, { shouldDirty: false, shouldTouch: false });
    }

    if (categoriaParam) {
      setValue("categoria", categoriaParam, { shouldDirty: false, shouldTouch: false });
    }

    if (dataVencimentoParam) {
      setValue("data_vencimento", dataVencimentoParam, { shouldDirty: false, shouldTouch: false });
    }
  }, [categoriaParam, dataVencimentoParam, editId, setValue, tipoParam]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (event) => {
      const actionType = event?.data?.action?.type;
      const isBackAction =
        actionType === "GO_BACK" || actionType === "POP" || actionType === "POP_TO_TOP";

      if (!isBackAction) return;

      event.preventDefault();
      router.replace("/");
    });

    return unsubscribe;
  }, [navigation, router]);

  const handleSave = async (data) => {
    try {
      setIsSaving(true);

      const typedPessoa = String(data.pessoa || "").trim();
      const pessoaExistente = typedPessoa ? await findPessoaByName(typedPessoa) : null;
      const pessoaId = pessoaExistente?.id_pessoa ?? null;
      const pessoaNome = pessoaExistente?.nome || typedPessoa || null;

      const payload = {
        tipo: data.tipo,
        valor: parseBrNumber(data.valor),
        categoria: data.categoria,
        id_pessoa: pessoaId,
        pessoa: pessoaNome,
        id_imobilizado: null,
        family_id: data.share_with_family && family?.id ? Number(family.id) : null,
        is_family_shared: data.share_with_family && family?.id ? 1 : 0,
        user_id: userData?.id ?? null,
        data_transacao: new Date().toISOString(),
        data_vencimento: normalizeDate(data.data_vencimento),
        status: data.status,
        observacao: data.observacao || null,
        json: JSON.stringify({ descricao: data.descricao || null }),
      };

      if (isEditMode && editId) {
        await updateTransacao(editId, payload);
        showNewToast("success", "Transação atualizada com sucesso.", "Sucesso");
      } else {
        if (data.recurrence_mode === "recorrente") {
          const recurrenceResult = await createRecurringTransacoes(payload, {
            frequency: data.recurrence_frequency,
            endDate: data.recurrence_end_date || null,
            intervalDays: data.recurrence_frequency === "dias"
              ? Number(data.recurrence_interval_days || 1)
              : null,
          });

          showNewToast(
            "success",
            `${recurrenceResult.created} lançamentos recorrentes criados com sucesso.`,
            "Sucesso"
          );
        } else {
          await createTransacao(payload);
          showNewToast("success", "Transação salva com sucesso.", "Sucesso");
        }
      }

      reset();
      router.replace("/");
    } catch (error) {
      showNewToast("error", String(error || "Falha ao salvar transação"), "Erro");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAwareScrollView
      className="w-full"
      style={{ marginBottom: insets.bottom, backgroundColor: themeColors.screen }}
      contentContainerStyle={{ flexGrow: 1 }}
      extraScrollHeight={30}
      keyboardShouldPersistTaps="handled"
      enableOnAndroid
    >
      <Animated.View entering={FadeIn.duration(300)}>
        <Box className="relative">
          {shouldShowSkeleton ? (
            <Box className="absolute left-0 right-0 top-0 z-50">
              <InsertFormSkeleton isDarkMode={isDarkMode} />
            </Box>
          ) : null}

          <Box
            className="gap-4 p-3"
            style={{ opacity: shouldShowSkeleton ? 0 : 1 }}
            pointerEvents={shouldShowSkeleton ? "none" : "auto"}
          >
          <TransacaoMainSection
            isDarkMode={isDarkMode}
            themeColors={themeColors}
            isEditMode={isEditMode}
            control={control}
            errors={errors}
            decimalMask={decimalMask}
            categorias={categorias}
            categoriaAtual={categoriaAtual}
            showCategorySheet={showCategorySheet}
            setShowCategorySheet={setShowCategorySheet}
            actionSheetContentStyle={actionSheetContentStyle}
            dataVencimento={dataVencimento}
            showDatePicker={showDatePicker}
            setShowDatePicker={setShowDatePicker}
            parseDateValue={parseDateValue}
            toISODate={toISODate}
            formatDateDisplay={formatDateDisplay}
            pessoaAtual={pessoaAtual}
            pessoaSuggestions={pessoaSuggestions}
            isPessoaFocused={isPessoaFocused}
            setIsPessoaFocused={setIsPessoaFocused}
            setPessoaSuggestions={setPessoaSuggestions}
            pessoaBlurTimeoutRef={pessoaBlurTimeoutRef}
            shareWithFamily={shareWithFamily}
            canShareWithFamily={Boolean(family?.id)}
            onShareWithFamilyChange={(nextValue) =>
              setValue("share_with_family", nextValue, {
                shouldDirty: true,
                shouldTouch: true,
              })
            }
          />

          <RecurrenceSection
            isDarkMode={isDarkMode}
            themeColors={themeColors}
            control={control}
            errors={errors}
            recurrenceMode={recurrenceMode}
            recurrenceFrequency={recurrenceFrequency}
            recurrenceFrequencyLabel={recurrenceFrequencyLabel}
            dataVencimento={dataVencimento}
            isEditMode={isEditMode}
            isFromRecurrence={isFromRecurrence}
            recurrenceMeta={recurrenceMeta}
            showRecurrenceEndPicker={showRecurrenceEndPicker}
            setShowRecurrenceEndPicker={setShowRecurrenceEndPicker}
            setValue={setValue}
            formatDateDisplay={formatDateDisplay}
            parseDateValue={parseDateValue}
            toISODate={toISODate}
          />

          <VStack className="w-full pb-5 justify-end">
          <ObservacaoSection control={control} errors={errors} isDarkMode={isDarkMode} themeColors={themeColors} />

            <HStack space="md" className="w-full justify-end">
              <Button action="secondary" size="lg" variant="outline" onPress={handleBack}>
                <ButtonText>Cancelar</ButtonText>
              </Button>
              <Button
                action="positive"
                size="lg"
                onPress={handleSubmit(handleSave)}
                isDisabled={isSaving || isLoading}
              >
                <ButtonIcon as={Save} />
                <ButtonText>
                  {isLoading ? "Carregando..." : isSaving ? "Salvando..." : "Salvar"}
                </ButtonText>
              </Button>
            </HStack>
          </VStack>
          </Box>
        </Box>
      </Animated.View>
    </KeyboardAwareScrollView>
  );
}
