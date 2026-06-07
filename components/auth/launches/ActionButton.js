import React, { memo } from "react";
import { Button, ButtonIcon, ButtonText } from "@/components/ui/button";

function ActionButton({ label, icon: Icon, onPress, colors, disabled, className }) {
	return (
		<Button
			action="secondary"
			variant="outline"
			size="sm"
			onPress={disabled ? undefined : onPress}
			className={`flex-1 ${className || ""}`}
			style={{
				borderColor: colors.border,
				opacity: disabled ? 0.4 : 1,
			}}
		>
			<ButtonIcon as={Icon} />
			{label && <ButtonText>{label}</ButtonText>}
		</Button>
	);
}

export default memo(ActionButton);
