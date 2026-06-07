import React, { memo } from "react";
import { Button, ButtonIcon, ButtonText } from "@/components/ui/button";

function ActionButton({ label, icon: Icon, onPress, colors, disabled }) {
	return (
		<Button
			action="secondary"
			variant="outline"
			size="sm"
			onPress={disabled ? undefined : onPress}
			className="flex-1"
			style={{
				borderColor: colors.border,
				opacity: disabled ? 0.4 : 1,
			}}
		>
			<ButtonIcon as={Icon} />
			<ButtonText>{label}</ButtonText>
		</Button>
	);
}

export default memo(ActionButton);
