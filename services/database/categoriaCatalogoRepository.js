import { Platform } from "react-native";
import { supabase } from "@/services/supabase/client";
import { db, nowISO } from "@/services/database/db";
import { loadRemoteCategoryCatalog } from "@/services/database/categoryCatalogRead";

const CATALOG_STALE_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

const FALLBACK_CATEGORIES = [
	{ id: null, nome: "Alimentação",   icone: "Utensils",       cor_hex: "#F97316", ordem: 1 },
	{ id: null, nome: "Moradia",       icone: "Home",           cor_hex: "#3B82F6", ordem: 2 },
	{ id: null, nome: "Transporte",    icone: "Car",            cor_hex: "#8B5CF6", ordem: 3 },
	{ id: null, nome: "Saúde",         icone: "HeartPulse",     cor_hex: "#EF4444", ordem: 4 },
	{ id: null, nome: "Educação",      icone: "GraduationCap",  cor_hex: "#10B981", ordem: 5 },
	{ id: null, nome: "Lazer",         icone: "Smile",          cor_hex: "#F59E0B", ordem: 6 },
	{ id: null, nome: "Salário",       icone: "Briefcase",      cor_hex: "#06B6D4", ordem: 7 },
	{ id: null, nome: "Investimentos", icone: "TrendingUp",     cor_hex: "#22C55E", ordem: 8 },
	{ id: null, nome: "Outros",        icone: "HelpCircle",     cor_hex: "#6B7280", ordem: 9 },
	{ id: null, nome: "Ajuste",        icone: "Scale",          cor_hex: "#64748B", ordem: 10 },
];

export function createCategoriaCatalogoRepository() {
	return {
		fetchAndCacheCategories: async () => {
			if (Platform.OS === "web" || !db) return;

			try {
				const newest = await db.getFirstAsync(
					`SELECT cached_at FROM categoria_catalogo ORDER BY cached_at DESC LIMIT 1`
				);
				if (newest?.cached_at) {
					const age = Date.now() - new Date(newest.cached_at).getTime();
					if (age < CATALOG_STALE_MS) return;
				}

				const { data, error } = await supabase
					.from("categoria_catalogo")
					.select("id, nome, icone, cor_hex, ordem, ativo")
					.eq("ativo", true)
					.order("ordem", { ascending: true })
					.order("nome",  { ascending: true });

				if (error || !data?.length) return;

				const now = nowISO();
				for (const item of data) {
					await db.runAsync(
						`INSERT OR REPLACE INTO categoria_catalogo
						    (id, nome, icone, cor_hex, ordem, ativo, cached_at)
						 VALUES (?, ?, ?, ?, ?, ?, ?)`,
						item.id,
						item.nome,
						item.icone ?? null,
						item.cor_hex,
						item.ordem ?? 0,
						item.ativo ? 1 : 0,
						now
					);
				}
			} catch {
				// sem internet ou tabela ainda não existe — ignora silenciosamente
			}
		},

		listCategories: async () => {
			if (Platform.OS === "web") {
				try {
					const data = (await loadRemoteCategoryCatalog()).filter(
						(item) => item.ativo !== false
					);
					if (data?.length) return data;
				} catch {
					// sem internet
				}
				return FALLBACK_CATEGORIES;
			}

			if (!db) return FALLBACK_CATEGORIES;

			try {
				const rows = await db.getAllAsync(
					`SELECT id, nome, icone, cor_hex, ordem, ativo
					 FROM categoria_catalogo
					 WHERE ativo = 1
					 ORDER BY ordem ASC, nome ASC`
				);

				if (rows?.length) return rows;

				// Cache vazio — tenta Supabase
				const { data } = await supabase
					.from("categoria_catalogo")
					.select("id, nome, icone, cor_hex, ordem, ativo")
					.eq("ativo", true)
					.order("ordem", { ascending: true })
					.order("nome",  { ascending: true });
				if (data?.length) return data;
			} catch {
				// sem internet ou tabela não existe — usa fallback hardcoded
			}

			return FALLBACK_CATEGORIES;
		},

		getCategoriaIdByName: async (nome) => {
			if (Platform.OS !== "web" && db) {
				try {
					const row = await db.getFirstAsync(
						`SELECT id FROM categoria_catalogo WHERE nome = ? AND ativo = 1 LIMIT 1`,
						nome
					);
					if (row?.id) return row.id;
				} catch {
					// tabela local ausente — tenta remoto
				}
			}

			try {
				const { data } = await supabase
					.from("categoria_catalogo")
					.select("id, nome, icone, cor_hex, ordem, ativo")
					.eq("nome", nome)
					.eq("ativo", true)
					.limit(1);
				const remote = data?.[0];
				if (!remote?.id) return null;

				if (Platform.OS !== "web" && db) {
					await db.runAsync(
						`INSERT OR REPLACE INTO categoria_catalogo
						    (id, nome, icone, cor_hex, ordem, ativo, cached_at)
						 VALUES (?, ?, ?, ?, ?, ?, ?)`,
						remote.id,
						remote.nome,
						remote.icone ?? null,
						remote.cor_hex,
						remote.ordem ?? 0,
						remote.ativo ? 1 : 0,
						nowISO()
					);
				}
				return remote.id;
			} catch {
				return null;
			}
		},
	};
}
