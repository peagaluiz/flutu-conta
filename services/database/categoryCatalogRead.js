import { supabase } from "@/services/supabase/client";
import { buildReadKey, readThrough } from "@/services/database/readCache";

const CATEGORY_CACHE_MS = 5 * 60 * 1000;

export function loadRemoteCategoryCatalog() {
	return readThrough(
		buildReadKey("category-catalog", { all: true }),
		async () => {
			const { data, error } = await supabase
				.from("categoria_catalogo")
				.select("id, nome, icone, cor_hex, ordem, ativo")
				.order("ordem", { ascending: true })
				.order("nome", { ascending: true });
			if (error) throw error.message ?? error;
			return data ?? [];
		},
		{ maxAgeMs: CATEGORY_CACHE_MS }
	);
}
