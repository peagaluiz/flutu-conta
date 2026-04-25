import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";

let AsyncStorage: any = null;
if (Platform.OS !== "web") {
  AsyncStorage = require("@react-native-async-storage/async-storage").default;
}

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Supabase env vars ausentes: EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_KEY"
  );
}

const authConfig: any = {
  autoRefreshToken: true,
  persistSession: true,
  detectSessionInUrl: false,
};

if (AsyncStorage) {
  authConfig.storage = AsyncStorage;
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: authConfig,
});
