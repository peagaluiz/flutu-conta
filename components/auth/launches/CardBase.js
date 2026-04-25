import React, { memo } from "react";
import { Box } from "@/components/ui/box";

function CardBase({ children, colors, danger = false }) {
    return (
        <Box
            className="rounded-2xl border p-4"
            style={{
                backgroundColor: danger ? colors.dangerBg : colors.surface,
                borderColor: danger ? colors.dangerText : colors.border,
            }}
        >
            {children}
        </Box>
    );
}

export default memo(CardBase);