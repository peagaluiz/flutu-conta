import { useEffect } from "react";

// Na web o splash animado nunca é exibido (ver showSplash em app/_layout.js).
// Este stub evita que o Metro tente resolver lottie-react-native/@lottiefiles no bundle web.
export default function AnimatedSplashScreen({ onAnimationFinish = () => {} }) {
	useEffect(() => {
		onAnimationFinish();
	}, [onAnimationFinish]);

	return null;
}
