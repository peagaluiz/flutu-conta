import { ScrollViewStyleReset } from "expo-router/html";

// Roda antes do primeiro paint: aplica o tema salvo (AsyncStorage web = localStorage)
// ou o do sistema, evitando flash claro/escuro enquanto o bundle carrega.
const themeScript = `(function () {
	try {
		var theme = localStorage.getItem("theme");
		if (theme !== "light" && theme !== "dark") {
			theme = window.matchMedia("(prefers-color-scheme: dark)").matches
				? "dark"
				: "light";
		}
		var root = document.documentElement;
		root.classList.add(theme);
		root.style.colorScheme = theme;
		root.style.backgroundColor = theme === "dark" ? "#0B0B0C" : "#F3F4F6";
	} catch (e) {}
})();`;

export default function Root({ children }) {
	return (
		<html lang="pt-BR">
			<head>
				<meta charSet="utf-8" />
				<meta httpEquiv="X-UA-Compatible" content="IE=edge" />
				<meta
					name="viewport"
					content="width=device-width, initial-scale=1, shrink-to-fit=no"
				/>
				<script dangerouslySetInnerHTML={{ __html: themeScript }} />
				<ScrollViewStyleReset />
			</head>
			<body>{children}</body>
		</html>
	);
}
