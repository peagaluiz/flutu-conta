import React, { memo } from "react";
import { Button, ButtonIcon, ButtonText } from "@/components/ui/button";

function ActionButton({ label, icon: Icon, onPress, colors }) {
	return (
		<Button
			action="secondary"
			variant="outline"
			size="sm"
			onPress={onPress}
			className="flex-1"
			style={{ borderColor: colors.border }}
		>
			<ButtonIcon as={Icon} />
			<ButtonText>{label}</ButtonText>
		</Button>
	);
}

export default memo(ActionButton);
