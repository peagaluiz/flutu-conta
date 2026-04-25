import React from 'react';
import { Button, ButtonIcon, ButtonText } from "@/components/ui/button";

interface RadioButtonProps {
    isSelected: boolean;
    onPress: () => void;
    text: string;
    icon?: React.ComponentType<any>;
    size?: 'sm' | 'md' | 'lg';
    action?: "primary" | "secondary" | "positive" | "negative" | "default";
}

const RadioButton: React.FC<RadioButtonProps> = ({
    isSelected,
    onPress,
    text,
    icon: IconComponent,
    size = 'md',
    action = 'primary',
    ...restProps
}) => {
    const buttonVariant = isSelected ? "solid" : "outline";

    return (
        <Button
            size={size}
            variant={buttonVariant}
            action={action}
            onPress={onPress}
            {...restProps}
        >
            {IconComponent && (
                // @ts-ignore // Mesma razão: ButtonIcon pode estar undefined
                <ButtonIcon as={IconComponent} mr="$2" />
            )}
            {/* @ts-ignore */}
            <ButtonText>{text}</ButtonText>
        </Button>
    );
};

export { RadioButton };