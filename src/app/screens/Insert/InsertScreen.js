import { Box } from "@/components/ui/box"
import { HStack } from "@/components/ui/hstack"
import { Skeleton, SkeletonText } from "@/components/ui/skeleton"

export default function Insert({ navigation }) {
    return (
        <Box className="w-100 gap-4 p-3 rounded-md">
            <Skeleton variant="sharp" className="h-[150px]" />
            <SkeletonText _lines={3} className="h-3" />
            <HStack className="gap-2 align-middle">
                <Skeleton variant="circular" className="h-[24px] w-[24px] mr-2" />
                <SkeletonText _lines={2} gap={1} className="h-2 w-2/5" />
            </HStack>
        </Box>
    );
}