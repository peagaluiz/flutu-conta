import { useState } from "react";
import { useToast, Toast, ToastTitle, ToastDescription } from '@/components/ui/toast';
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Pressable } from '@/components/ui/pressable';
import { Icon, AlertCircleIcon, CloseIcon } from "@/components/ui/icon";
import { CircleCheck, CircleAlert, CircleX, MessageCircleMore, MessageCircleOff } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function useErrorToast() {
    const toast = useToast();
    const insets = useSafeAreaInsets();
    const [activeToast, setActiveToast] = useState(false);

    const getIcon = (action: string) => {
        switch (action) {
            case "success": return CircleCheck;
            case "warning": return CircleAlert;
            case "error": return CircleX;
            case "info": return MessageCircleMore;
            default: return MessageCircleOff;
        }
    };

    const getActionColor = (action: string) => {
        switch (action) {
            case "success": return "stroke-success-500";
            case "warning": return "stroke-warning-500";
            case "info": return "stroke-info-500";
            case "muted": return "stroke-background-500";
            default: return "stroke-error-500";
        }
    };

    const showNewToast = (action?: "error" | "warning" | "success" | "info" | "muted", message?: string, title?: string, variant?: "solid" | "outline") => {
        setActiveToast(true);
        
        const IconComponent = getIcon(action);
        const iconColorClass = getActionColor(action);

        toast.show({
            placement: "top",
            duration: 3000,
            onCloseComplete: () => setActiveToast(false),
            render: ({ id }) => (
                <Toast
                    action={action || "error"}
                    variant={variant || "outline"}
                    nativeID={`toast-${id}`}
                    style={{
                        marginTop: insets.top + (!activeToast ? 10 : insets.top * -1),
                        marginInline: 0
                    }}
                    className={`mx-0 p-4 gap-6 ${iconColorClass.replace("stroke", "border")} w-full shadow-hard-5 max-w-[443px] flex-row justify-between`}
                >
                    <HStack className="max-w-[80%]" space="md">
                        <Icon  as={IconComponent} className={`${iconColorClass} mt-0.5`} />
                        <VStack space="xs">
                            <ToastTitle className={`font-semibold ${iconColorClass.replace("stroke", "text")}`}>
                                {title || (action != "success" ? "Erro!" : "Sucesso!")}
                            </ToastTitle>
                            <ToastDescription size="sm">
                                {(typeof message === "string" ? message : null) || (action != "success" ? "Algo deu errado, tente novamente" : "Operação realizada com sucesso")}
                            </ToastDescription>
                        </VStack>
                    </HStack>

                    <Pressable onPress={() => toast.close(id)}>
                        <Icon as={CloseIcon} />
                    </Pressable>
                </Toast>
            ),
        });
    };

    return { showNewToast };
}
