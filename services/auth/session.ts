import { Platform } from "react-native";
import * as native from "./sessionNative";
import * as web from "./sessionWeb";

// Ponto único de escolha da implementação de auth por plataforma.
export const authSession = Platform.OS === "web" ? web : native;

export type { AuthUser, LoginPayload, RestoredSession } from "./authUser";
