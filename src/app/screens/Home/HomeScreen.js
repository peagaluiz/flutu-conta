import { ScrollView, View } from 'react-native';
import { Box } from "@/components/ui/box"
import { Button, ButtonIcon, ButtonText } from "@/components/ui/button"
import { Skeleton, SkeletonText } from "@/components/ui/skeleton"
import { Banknote } from "lucide-react-native";
import { Banknote as BanknoteWeb } from 'lucide-react'; // só para web
import { isWeb } from '@gluestack-ui/nativewind-utils/IsWeb';
import { Grid, GridItem } from "@/components/ui/grid"

export default function Home({ navigation }) {
    return (
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
            <Box className="w-100 gap-4 p-3 rounded-md">
                <Grid>
                    <GridItem _extra={{ className: "col-span-12" }}>
                        <Skeleton variant="rounded" className="h-[150px]" />
                    </GridItem>
                </Grid>

                <Grid className="grid w-full">
                    <GridItem className="" _extra={{ className: "col-span-8" }}>
                        <Skeleton variant="rounded" className="h-[24px]" />
                    </GridItem>
                    <GridItem className="" _extra={{ className: "col-span-4" }}>
                        <View className="w-100 p-0">
                            <Button size="lg" action="primary" style={{ height: "40" }} onPress={() => navigation.navigate("Insert")}>
                                <ButtonIcon color='white' as={(isWeb ? BanknoteWeb : Banknote)} />
                                <ButtonText size="lg">Inserir</ButtonText>
                            </Button>
                        </View>
                    </GridItem>
                </Grid>
            </Box>
        </ScrollView>
    );
}