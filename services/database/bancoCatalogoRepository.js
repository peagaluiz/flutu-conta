import { Platform } from "react-native";
import * as FileSystem from "expo-file-system";
import { supabase } from "@/services/supabase/client";
import { db, nowISO } from "@/services/database/db";

const CATALOG_STALE_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

export function createBancoCatalogoRepository() {
    return {
        fetchAndCacheCatalog: async () => {
            if (Platform.OS === "web" || !db) return;

            // Verifica se o cache ainda é fresco. Só respeita a trava de staleness
            // se já existir ao menos uma logo em cache — assim, quando novas logos
            // forem cadastradas no Supabase, um cache antigo (sem logos) se atualiza
            // na hora em vez de esperar a janela de 7 dias.
            const newest = await db.getFirstAsync(
                `SELECT cached_at FROM banco_catalogo ORDER BY cached_at DESC LIMIT 1`
            );
            const logoCount = await db.getFirstAsync(
                `SELECT COUNT(*) AS n FROM banco_catalogo WHERE logo_url IS NOT NULL`
            );
            const hasCachedLogos = Number(logoCount?.n ?? 0) > 0;
            if (hasCachedLogos && newest?.cached_at) {
                const age = Date.now() - new Date(newest.cached_at).getTime();
                if (age < CATALOG_STALE_MS) return;
            }

            const { data, error } = await supabase
                .from("banco_catalogo")
                .select("id, nome, cor_hex, logo_url, ativo")
                .eq("ativo", true)
                .order("nome", { ascending: true });

            if (error || !data?.length) return;

            const now = nowISO();

            for (const item of data) {
                // Preserva logo_local_path existente no upsert
                const existing = await db.getFirstAsync(
                    `SELECT logo_local_path FROM banco_catalogo WHERE id = ?`,
                    item.id
                );
                await db.runAsync(
                    `INSERT OR REPLACE INTO banco_catalogo
                        (id, nome, cor_hex, logo_url, logo_local_path, ativo, cached_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    item.id,
                    item.nome,
                    item.cor_hex,
                    item.logo_url ?? null,
                    existing?.logo_local_path ?? null,
                    item.ativo ? 1 : 0,
                    now
                );
            }

            // Baixa logos que ainda não estão em cache local (em sequência)
            for (const item of data) {
                if (!item.logo_url) continue;

                const row = await db.getFirstAsync(
                    `SELECT logo_local_path FROM banco_catalogo WHERE id = ?`,
                    item.id
                );
                if (row?.logo_local_path) continue;

                try {
                    const dest =
                        FileSystem.cacheDirectory + `banco_logo_${item.id}.png`;
                    const result = await FileSystem.downloadAsync(
                        item.logo_url,
                        dest
                    );
                    if (result.status === 200) {
                        await db.runAsync(
                            `UPDATE banco_catalogo SET logo_local_path = ? WHERE id = ?`,
                            result.uri,
                            item.id
                        );
                    }
                } catch {
                    // falha no logo não bloqueia o resto
                }
            }
        },

        listCatalog: async () => {
            if (Platform.OS === "web") {
                const { data } = await supabase
                    .from("banco_catalogo")
                    .select("id, nome, cor_hex, logo_url, ativo")
                    .eq("ativo", true)
                    .order("nome", { ascending: true });
                return data ?? [];
            }

            if (!db) return [];

            const rows = await db.getAllAsync(
                `SELECT id, nome, cor_hex, logo_url, logo_local_path, ativo
                 FROM banco_catalogo
                 WHERE ativo = 1
                 ORDER BY nome ASC`
            );

            if (rows?.length) return rows;

            // Fallback: Supabase se o cache estiver vazio
            try {
                const { data } = await supabase
                    .from("banco_catalogo")
                    .select("id, nome, cor_hex, logo_url, ativo")
                    .eq("ativo", true)
                    .order("nome", { ascending: true });
                return data ?? [];
            } catch {
                return [];
            }
        },
    };
}
