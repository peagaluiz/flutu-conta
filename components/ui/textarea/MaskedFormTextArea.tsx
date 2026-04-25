// components/ui/MaskedFormTextArea.tsx
import React from "react";
import {
    FormControl,
    FormControlLabel,
    FormControlLabelText,
    FormControlError,
    FormControlErrorIcon,
    FormControlErrorText
} from "@/components/ui/form-control";
import { Textarea, TextareaInput } from "@/components/ui/textarea";
import { AlertCircleIcon } from "@/components/ui/icon";
import { KeyboardTypeOptions, StyleProp, ViewStyle } from "react-native";

interface MaskedFormTextAreaProps {
    type?: string;
    label: string;
    value?: string;
    onChange: (value: string) => void;
    onFocus?: (event: any) => void;
    onBlur: () => void;
    error?: { message?: string };
    placeholder?: string;
    keyboardType?: KeyboardTypeOptions;
    className?: string;
    classNameInputTag?: string;
    classNameInput?: string;
    classNameLabel?: string;
    isRequired?: boolean;
    inputContainerStyle?: StyleProp<ViewStyle>;
}

export const MaskedFormTextArea: React.FC<MaskedFormTextAreaProps> = ({
    type,
    label,
    value,
    onChange,
    onFocus,
    onBlur,
    error,
    placeholder,
    keyboardType = "default",
    className = "",
    classNameInputTag = "",
    classNameInput = "",
    classNameLabel = "",
    isRequired = true,
    inputContainerStyle,
}) => {
    return (
        <FormControl size="md" isRequired={isRequired} isInvalid={!!error} className={`my-1 ${className + (type == "hidden" ? " hidden" : "")}`}>
            <FormControlLabel>
                <FormControlLabelText className={classNameLabel}>{label}</FormControlLabelText>
            </FormControlLabel>
            <Textarea className={`my-1 ${classNameInputTag}`} style={inputContainerStyle}>
                <TextareaInput
                    value={value}
                    keyboardType={keyboardType}
                    placeholder={placeholder}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    className={`flex-1 h-full py-0 px-2 bg-transparent border-0 outline-0 ${classNameInput}`}
                    style={{ textAlign: classNameInput.includes("text-end") ? "right" : "left" }}
                />
            </Textarea>
            {error && (
                <FormControlError style={{ maxWidth: "100%" }}>
                    <FormControlErrorIcon as={AlertCircleIcon} />
                    <FormControlErrorText style={{ flexShrink: 1, flexWrap: 'wrap' }}>{error.message}</FormControlErrorText>
                </FormControlError>
            )}
        </FormControl>
    );
};