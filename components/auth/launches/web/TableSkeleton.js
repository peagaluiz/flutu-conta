import { View } from "react-native";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

// `toolbarLeft` mantém os filtros rápidos visíveis enquanto a tabela carrega,
// na mesma posição em que a DataTable os renderiza.
export function TableSkeleton({ toolbarLeft, colors }) {
    return (
        <View style={{ flex: 1 }}>
            {toolbarLeft ? (
                <View
                    style={{
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        borderBottomWidth: 1,
                        borderBottomColor: colors?.border,
                    }}
                >
                    {toolbarLeft}
                </View>
            ) : null}

            <Skeleton
                style={{
                    width: "100%",
                    height: 42,
                    borderRadius: 0,
                }}
            />

            <View style={{ paddingHorizontal: 8 }}>
                <View
                    style={{
                        height: 52,
                        justifyContent: "center",
                    }}
                >
                    <SkeletonText
                        _lines={1}
                        style={{
                            width: "100%",
                            height: 16,
                            borderRadius: 4,
                        }}
                    />
                </View>

                <View
                    style={{
                        height: 52,
                        flexDirection: "row",
                        alignItems: "center",
                    }}
                >
                    <View style={{ flex: 2, paddingRight: 6 }}>
                        <SkeletonText
                            _lines={1}
                            style={{
                                width: "100%",
                                height: 16,
                                borderRadius: 4,
                            }}
                        />
                    </View>

                    <View style={{ flex: 1, paddingLeft: 6 }}>
                        <SkeletonText
                            _lines={1}
                            style={{
                                width: "100%",
                                height: 16,
                                borderRadius: 4,
                            }}
                        />
                    </View>
                </View>
            </View>

            <Skeleton
                style={{
                    width: "100%",
                    height: 43,
                    marginTop: 8,
                    borderRadius: 0,
                }}
            />
        </View>
    );
}
