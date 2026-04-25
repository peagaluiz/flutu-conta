// components/ui/FormRadioGroup.tsx
import React, { ComponentType, useMemo } from "react";
import {
    FormControl,
    FormControlLabel,
    FormControlLabelText,
    FormControlError,
    FormControlErrorIcon,
    FormControlErrorText,
} from "@/components/ui/form-control";
import { ButtonGroup } from "@/components/ui/button";
import { RadioButton as BaseRadioButton } from "@/components/ui/radio-button";
import { AlertCircleIcon } from "@/components/ui/icon";

export interface RadioOption {
    label: string;
    value: string;
    icon?: ComponentType<any>;
    selected?: boolean;
}

// estende o RadioButton para aceitar className
type RadioButtonWithClassName = React.ComponentType<
    React.ComponentProps<typeof BaseRadioButton> & { className?: string }
>;
const RadioButton = BaseRadioButton as RadioButtonWithClassName;

interface FormRadioGroupProps {
    label: string;
    value?: string;
    onChange: (value: string) => void;
    options: RadioOption[];
    error?: { message?: string };
    className?: string;
    orientation?: "horizontal" | "vertical";
    isRequired?: boolean;
}

export const FormRadioGroup: React.FC<FormRadioGroupProps> = ({
    label,
    value,
    onChange,
    options,
    error,
    className = "",
    orientation = "horizontal",
    isRequired = false,
}) => {
    // resolve o valor inicial
    const resolvedValue = useMemo(() => {
        if (value) return value;
        const preSelected = options.find((opt) => opt.selected);
        return preSelected ? preSelected.value : undefined;
    }, [value, options]);

    return (
        <FormControl
            size="md"
            isRequired={isRequired}
            isInvalid={!!error}
            className={`my-1 w-full ${className}`}
        >
            <FormControlLabel>
                <FormControlLabelText>{label}</FormControlLabelText>
            </FormControlLabel>

            <ButtonGroup
                className="w-full"
                flexDirection={orientation === "horizontal" ? "row" : "column"}
                isAttached
            >
                {options.map((opt, index) => {
                    const isFirst = index === 0;
                    const isLast = index === options.length - 1;

                    let extraClasses = "rounded-none border-background-300 my-1";
                    if (orientation === "horizontal") {
                        extraClasses += " w-[50%]";
                        if (options.length > 1) {
                            if (isFirst) extraClasses += " rounded-l-md";
                            else if (isLast) extraClasses += " rounded-r-md";
                        }
                    } else {
                        extraClasses += " w-full";
                        if (options.length > 1) {
                            if (isFirst) extraClasses += " rounded-t-md";
                            else if (isLast) extraClasses += " rounded-b-md";
                        }
                        if (isFirst) extraClasses += " mb-0";
                        else if (isLast) extraClasses += " mt-0";
                        else extraClasses += " m-0";
                    }

                    return (
                        <RadioButton
                            key={opt.value}
                            size="md"
                            isSelected={resolvedValue === opt.value}
                            onPress={() => onChange(opt.value)}
                            action="primary"
                            text={opt.label}
                            icon={opt.icon}
                            className={extraClasses}
                        />
                    );
                })}
            </ButtonGroup>

            {error && (
                <FormControlError>
                    <FormControlErrorIcon as={AlertCircleIcon} />
                    <FormControlErrorText>{error.message}</FormControlErrorText>
                </FormControlError>
            )}
        </FormControl>
    );
};
