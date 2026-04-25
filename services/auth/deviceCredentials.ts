import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

type SavedCredentials = {
  email: string;
  senha: string;
};

const SAVED_LOGIN_KEY = "saved_login_credentials_v1";

function getLocalAuthenticationModule() {
  try {
    // Optional native dependency: avoid crashing the app when the module
    // is unavailable in the current runtime/build.
    return require("expo-local-authentication");
  } catch {
    return null;
  }
}

export async function isDeviceSecurityAvailable() {
  if (Platform.OS === "web") return false;

  const LocalAuthentication = getLocalAuthenticationModule();
  if (!LocalAuthentication) return false;

  return LocalAuthentication.hasHardwareAsync();
}

export async function saveDeviceLoginCredentials(credentials: SavedCredentials) {
  if (Platform.OS === "web") return;

  await SecureStore.setItemAsync(SAVED_LOGIN_KEY, JSON.stringify(credentials), {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function clearDeviceLoginCredentials() {
  if (Platform.OS === "web") return;
  await SecureStore.deleteItemAsync(SAVED_LOGIN_KEY);
}

export async function getDeviceLoginCredentials(): Promise<SavedCredentials | null> {
  if (Platform.OS === "web") return null;

  const raw = await SecureStore.getItemAsync(SAVED_LOGIN_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (!parsed?.email || !parsed?.senha) return null;
    return {
      email: String(parsed.email),
      senha: String(parsed.senha),
    };
  } catch {
    return null;
  }
}

export async function hasDeviceLoginCredentials() {
  const saved = await getDeviceLoginCredentials();
  return Boolean(saved);
}

export async function authenticateWithDeviceSecurity() {
  if (Platform.OS === "web") {
    throw new Error("Autenticação do dispositivo não está disponível no navegador");
  }

  const LocalAuthentication = getLocalAuthenticationModule();
  if (!LocalAuthentication) {
    throw new Error("Módulo de biometria não está disponível neste build do app");
  }

  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  if (!hasHardware) {
    throw new Error("Este dispositivo não suporta biometria/senha de bloqueio para este login");
  }

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: "Entrar com segurança do dispositivo",
    cancelLabel: "Cancelar",
    fallbackLabel: "Usar senha do celular",
    disableDeviceFallback: false,
  });

  if (!result.success) {
    throw new Error("Autenticação do dispositivo cancelada ou não confirmada");
  }
}
