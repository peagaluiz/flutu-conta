import React from "react";

import { Box } from "@/components/ui/box";
import Loader from "@/components/ui/loader";

export default function LaunchesFooterLoader({ show }) {
	if (!show) return null;

	return (
		<Box className="py-4">
			<Loader />
		</Box>
	);
}
