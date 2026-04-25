import { Box } from "@/components/ui/box";
import { Button, ButtonText } from "@/components/ui/button";
import { Link, Stack } from 'expo-router';
import { ScrollView } from 'react-native';

export default function NotFound() {
    return (
        <>
            <Stack.Screen name="index" options={{ title: "Oops!" }} />
            <ScrollView contentContainerStyle={{ flexGrow: 1, height: "90vh" }}>
                <Box className="gap-4 p-3 rounded-md" style={{ height: "100%", justifyContent: "center", paddingBottom: 100 }}>
                    <Link href="/" asChild>
                        <Button className="w-full" action="primary" style={{ height: 70 }}>
                            <ButtonText>Voltar para o início</ButtonText>
                        </Button>
                    </Link>
                </Box>
            </ScrollView>
        </>
    );
}