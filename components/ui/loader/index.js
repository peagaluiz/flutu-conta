import React from "react";
import { Spinner } from "@/components/ui/spinner";

import { Box } from "@/components/ui/box";

export default function Loader({ className }) {
    return (
        <Box className={`flex h-full w-full items-center justify-center ${className}`} style={{ zIndex: 999, flex: 1 }}>
            <Spinner size="large" color="grey" />
        </Box>
    );
}