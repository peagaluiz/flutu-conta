import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";
import { apiFetch } from "@/services/http/apiFetch";

let AsyncStorage: any = null;
if (Platform.OS !== "web") {
  AsyncStorage = require("@react-native-async-storage/async-storage").default;
}

const isWeb = Platform.OS === "web";

// Web: aponta pro proxy /db (services de dados continuam usando .from()/.rpc()
// sem mudar nada - so o transporte muda). A key e um placeholder ignorado: o
// proxy sempre injeta a publishable key de verdade no servidor. Nativo segue
// com a URL/key reais e Authorization: Bearer do supabase-js.
// window nao existe durante o static rendering do expo export (prerender em
// Node) - esse valor nunca e usado pra rede nesse contexto, so precisa ser
// uma URL valida pra createClient nao explodir no module load.
const supabaseUrl = isWeb
  ? `${typeof window !== "undefined" ? window.location.origin : "https://build-time-placeholder.invalid"}/db`
  : process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = isWeb ? "proxy" : process.env.EXPO_PUBLIC_SUPABASE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Supabase env vars ausentes: EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_KEY"
  );
}

// Web nao gerencia sessao no client (persistSession:false) - ela vive so no
// cookie httpOnly setado pelo BFF. Auth passa pelos endpoints /api/auth/* via
// apiFetch, nunca por supabase.auth.* diretamente.
const authConfig: any = isWeb
  ? {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    }
  : {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    };

if (AsyncStorage) {
  authConfig.storage = AsyncStorage;
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: authConfig,
  // apiFetch inclui credentials (cookie) e trata 401 centralizado nas
  // chamadas .from()/.rpc() que passam pelo proxy /db.
  global: isWeb ? { fetch: apiFetch as unknown as typeof fetch } : undefined,
});
