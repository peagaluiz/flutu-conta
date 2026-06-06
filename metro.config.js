const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push("wasm");
config.resolver.sourceExts.push("wasm");

config.resolver.resolveRequest = function packageExportsResolver(
	context,
	moduleImport,
	platform
) {
	if (moduleImport === "<package>" || moduleImport.startsWith("<package>/")) {
		return context.resolveRequest(
			{
				...context,
				unstable_conditionNames: ["browser"],
			},
			moduleImport,
			platform
		);
	}
	return context.resolveRequest(context, moduleImport, platform);
};

module.exports = withNativeWind(config, { input: "./global.css" });
