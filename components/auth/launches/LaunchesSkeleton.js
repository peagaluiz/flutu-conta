import React, { memo } from "react";
import { VStack } from "@/components/ui/vstack";
import { Skeleton } from "@/components/ui/skeleton";

function LaunchesSkeleton() {
    return (
        <VStack className="gap-3">
            <Skeleton className="h-20 rounded-2xl" />
            <Skeleton className="h-20 rounded-2xl" />
            <Skeleton className="h-20 rounded-2xl" />
        </VStack>
    );
}

export default memo(LaunchesSkeleton);