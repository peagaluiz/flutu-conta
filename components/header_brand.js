import React from "react"
import { HStack } from "@/components/ui/hstack"
import { Heading } from "@/components/ui/heading"
import { Text } from "@/components/ui/text"


const HeaderWrapper = ({ navigation, theme }) => {
    return (
        <HStack className="h-full w-full items-center p-0">
            <Heading size="xl" bold>Flutu</Heading><Text size="2xl" className="text-primary-600">Conta</Text>
        </HStack>
    );
}

export default function HeaderBrand({ navigation }) {
    return <HeaderWrapper navigation={navigation} />;
}