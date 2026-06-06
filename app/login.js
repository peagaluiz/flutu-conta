import { useForm } from "react-hook-form";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/components/ui/gluestack-ui-provider/ThemeProvider/ThemeProvider";
import { getThemeColors } from "@/constants/colors";
import { LoginAnimatedShell } from "@/components/auth/login/LoginAnimatedShell";
import { LoginLoadingCard } from "@/components/auth/login/LoginLoadingCard";
import { LoginSmartCard } from "@/components/auth/login/LoginSmartCard";
import { LoginFormCard } from "@/components/auth/login/LoginFormCard";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { useRouter } from "expo-router";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useLoginAnimation } from "@/hooks/auth/useLoginAnimation";
import { useLoginFlow } from "@/hooks/auth/useLoginFlow";

const loginSchema = yup.object({
	email: yup.string().required("O campo Email e obrigatorio"),
	senha: yup.string().required("O campo Senha e obrigatorio"),
});

export default function Login() {
	const router = useRouter();
	const { theme } = useTheme();
	const colors = getThemeColors(theme);
	const insets = useSafeAreaInsets();
	const sheetAnimatedStyle = useLoginAnimation();

	const {
		mode,
		setMode,
		savedCredentials,
		smartStatus,
		smartError,
		isSubmitting,
		rememberLogin,
		setRememberLogin,
		savedDisplayName,
		avatarInitial,
		submitLogin,
	} = useLoginFlow();

	const {
		control,
		handleSubmit,
		setValue,
		formState: { errors },
	} = useForm({
		resolver: yupResolver(loginSchema),
		defaultValues: { email: "", senha: "" },
	});

	const handleUseOtherAccount = () => {
		setMode("form");
		setValue("email", "");
		setValue("senha", "");
		setRememberLogin(false);
	};

	const handleUsePassword = () => {
		setMode("form");
		if (savedCredentials?.email) setValue("email", savedCredentials.email);
		setValue("senha", "");
		setRememberLogin(true);
	};

	return (
		<KeyboardAwareScrollView
			className="w-full"
			style={{ backgroundColor: colors.screen }}
			contentContainerStyle={{ flexGrow: 1 }}
			extraScrollHeight={10}
			keyboardShouldPersistTaps="handled"
			enableOnAndroid
		>
			<LoginAnimatedShell
				colors={colors}
				insets={insets}
				isDarkMode={theme === "dark"}
				sheetAnimatedStyle={sheetAnimatedStyle}
			>
				{mode === "loading" && <LoginLoadingCard colors={colors} />}

				{mode === "smart" && (
					<LoginSmartCard
						colors={colors}
						avatarInitial={avatarInitial}
						savedDisplayName={savedDisplayName}
						email={savedCredentials?.email}
						smartStatus={smartStatus}
						smartError={smartError}
						onUsePassword={handleUsePassword}
						onUseOtherAccount={handleUseOtherAccount}
					/>
				)}

				{mode === "form" && (
					<LoginFormCard
						colors={colors}
						control={control}
						errors={errors}
						rememberLogin={rememberLogin}
						onRememberLoginChange={setRememberLogin}
						isSubmitting={isSubmitting}
						onSubmit={handleSubmit(submitLogin)}
						onForgotPassword={() => router.push("/recuperar-senha")}
					/>
				)}
			</LoginAnimatedShell>
		</KeyboardAwareScrollView>
	);
}
