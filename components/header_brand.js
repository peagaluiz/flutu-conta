import React from "react"
import { HStack } from "@/components/ui/hstack"
import { Heading } from "@/components/ui/heading"
import { Text } from "@/components/ui/text"
import { useTheme } from "@/components/ui/gluestack-ui-provider/ThemeProvider/ThemeProvider";
import { getThemeColors } from "@/constants/colors";


const HeaderWrapper = ({ navigation, theme }) => {
    const { theme: currentTheme } = useTheme();
    const colors = getThemeColors(currentTheme);

    return (
        <HStack className="h-full w-full items-center p-0">
            <Heading size="xl" bold style={{ color: colors.textPrimary }}>Flutu</Heading>
            <Text size="2xl" style={{ color: colors.brand }}>Conta</Text>
        </HStack>
    );
}

export default function HeaderBrand({ navigation }) {
    return <HeaderWrapper navigation={navigation} />;
}