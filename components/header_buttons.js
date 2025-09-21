import React from "react"
import { Platform } from 'react-native';
import { HStack } from "@/components/ui/hstack"
import { Heading } from "@/components/ui/heading"
import { Divider } from '@/components/ui/divider';
import {
    Button,
    ButtonIcon
} from "@/components/ui/button"
import {
    LogOut,
    Settings,
    Banknote,
    X
} from "lucide-react-native"
import {
    Avatar,
    AvatarBadge,
    AvatarFallbackText,
    AvatarImage,
} from "@/components/ui/avatar"
import {
    Actionsheet,
    ActionsheetBackdrop,
    ActionsheetContent,
    ActionsheetItem,
    ActionsheetItemText,
    ActionsheetIcon,
} from '@/components/ui/actionsheet';


const HeaderWrapper = ({ navigation, theme }) => {
    const [showActionsheet, setShowActionsheet] = React.useState(false);
    const handleClose = () => setShowActionsheet(false);

    return (
        <HStack className="p-0 justify-start gap-4" style={{ marginRight: 10 }}>
            <Button size="lg" className="h-[30px] w-[30px] rounded-full p-6" onPress={() => setShowActionsheet(true)}>
                <Avatar size="md">
                    <AvatarFallbackText>{'User'}</AvatarFallbackText>
                    <AvatarImage src="assets/avatar.png" />
                </Avatar>
            </Button>
            <Actionsheet isOpen={showActionsheet} onClose={handleClose}>
                <ActionsheetBackdrop />
                <ActionsheetContent>
                    <HStack reversed={true} className="w-full justify-between items-center mb-4">
                        <Button variant="link" className="p-4" onPress={handleClose}>
                            <ButtonIcon size="lg" as={X} className="stroke-background-700" />
                        </Button>
                    </HStack>
                    <HStack className="w-full justify-between items-center mb-4">
                        <Avatar size="md">
                            <AvatarFallbackText>Jane Doe</AvatarFallbackText>
                            <AvatarImage src="assets/avatar.png" />
                            <AvatarBadge />
                        </Avatar>
                        <Heading size="lg" className="text-background-700">Jane Doe</Heading>
                        <Button variant="link" className="p-4">
                            <ButtonIcon size="lg" className="stroke-background-700" as={Settings} />
                        </Button>
                    </HStack>
                    <Divider className="my-4" />
                    <ActionsheetItem>
                        <ActionsheetIcon size="lg" className="stroke-background-700" as={Banknote} />
                        <ActionsheetItemText size="lg">Salário</ActionsheetItemText>
                    </ActionsheetItem>
                    <ActionsheetItem className="my-4">
                        <ActionsheetIcon size="lg" className="stroke-background-700" as={LogOut} />
                        <ActionsheetItemText size="lg">Sair</ActionsheetItemText>
                    </ActionsheetItem>
                </ActionsheetContent>
            </Actionsheet>
        </HStack>
    );
}

export default function HeaderButtons({ navigation }) {
    return <HeaderWrapper navigation={navigation} />;
}