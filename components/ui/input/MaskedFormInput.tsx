// components/ui/MaskedFormInput.tsx
import React from "react";
import MaskInput from "react-native-mask-input";
import {
    FormControl,
    FormControlLabel,
    FormControlLabelText,
    FormControlError,
    FormControlErrorIcon,
    FormControlErrorText
} from "@/components/ui/form-control";
import { Input, InputSlot, InputIcon, InputField } from "@/components/ui/input";
import { AlertCircleIcon, EyeIcon, EyeOffIcon } from "@/components/ui/icon";
import { Pressable } from "@/components/ui/pressable";
import { KeyboardTypeOptions } from "react-native";
import { StyleProp, TextStyle, ViewStyle } from "react-native";

interface MaskedFormInputProps {
    type?: string;
    label: string;
    value?: string;
    onChange: (value: string) => void;
    onFocus?: (event: any) => void;
    onBlur: () => void;
    mask?: (string | RegExp)[];
    error?: { message?: string };
    placeholder?: string;
    icon?: React.ElementType;
    keyboardType?: KeyboardTypeOptions;
    className?: string;
    variant?: "outline" | "underlined" | "rounded";
    isPassword?: boolean;
    classNameInputTag?: string;
    classNameInput?: string;
    classNameLabel?: string;
    useMaskedValue?: boolean;
    isRequired?: boolean;
    style?: StyleProp<TextStyle>;
    inputContainerStyle?: StyleProp<ViewStyle>;
}

export const MaskedFormInput: React.FC<MaskedFormInputProps> = ({
    type,
    label,
    value,
    onChange,
    onFocus,
    onBlur,
    mask,
    error,
    icon,
    placeholder,
    keyboardType = "default",
    className = "",
    variant = "outline",
    isPassword = false,
    classNameInputTag = "",
    classNameInput = "",
    classNameLabel = "",
    useMaskedValue = false,
    isRequired = true,
    style,
    inputContainerStyle,
}) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const handleState = () => {
        setShowPassword((v) => !v);
    };

    return (
        <FormControl size="md" isRequired={isRequired} isInvalid={!!error} className={`my-1 ${className + (type == "hidden" ? " hidden" : "")}`}>
            {label && (
                <FormControlLabel>
                    <FormControlLabelText className={classNameLabel}>
                        {label}
                    </FormControlLabelText>
                </FormControlLabel>
            )}
            <Input className={`my-1 ${classNameInputTag}`} variant={variant} style={inputContainerStyle}>
                {icon && (
                    <InputSlot style={{ paddingLeft: 5 }}>
                        <InputIcon as={icon} />
                    </InputSlot>)}
                {mask && !isPassword ?
                    <MaskInput
                        value={value}
                        mask={mask}
                        keyboardType={keyboardType}
                        placeholder={placeholder}
                        onFocus={onFocus}
                        onBlur={onBlur}
                        onChangeText={(masked, unmasked) => { onChange((useMaskedValue ? masked : unmasked)) }}
                        className={`flex-1 h-full py-0 px-2 bg-transparent border-0 outline-0 ${classNameInput}`}
                        style={[{ textAlign: classNameInput.includes("text-end") ? "right" : "left" }, style]}
                    />
                    : <InputField
                        type={isPassword ? (showPassword ? 'text' : 'password') : 'text'}
                        value={value}
                        keyboardType={keyboardType}
                        placeholder={placeholder}
                        onFocus={onFocus}
                        onBlur={onBlur}
                        onChangeText={onChange}
                        className={`flex-1 h-full py-0 px-2 bg-transparent border-0 outline-0 ${classNameInput}`}
                        style={[{ textAlign: classNameInput.includes("text-end") ? "right" : "left" }, style]}
                    />}
                {isPassword && (
                    <Pressable
                        onPressIn={(e) => e.preventDefault?.()}
                        onPress={handleState}
                        focusable={false}
                        accessible={false}
                    >
                        <InputIcon as={showPassword ? EyeIcon : EyeOffIcon} />
                    </Pressable>
                )}
            </Input>
            {error && (
                <FormControlError style={{ maxWidth: "100%" }}>
                    <FormControlErrorIcon as={AlertCircleIcon} />
                    <FormControlErrorText style={{ flexShrink: 1, flexWrap: 'wrap' }}>{error.message}</FormControlErrorText>
                </FormControlError>
            )}
        </FormControl>
    );
};