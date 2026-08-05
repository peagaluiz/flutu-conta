import { useEffect, useRef, useState } from "react";

// Carrega a lista de recorrências (só leitura) mostrada abaixo das transações no web.
// O skeleton só aparece ao (re)entrar na aba; refreshes atualizam em silêncio.
export function useRecorrenciasWeb({ database, section, userData, family, familyReady, reloadKey }) {
	const [recorrencias, setRecorrencias] = useState([]);
	const [loading, setLoading] = useState(false);
	const skeletonSectionRef = useRef(null);

	useEffect(() => {
		if (section !== "transacoes" || !familyReady || !userData?.id) return;
		let active = true;

		if (skeletonSectionRef.current !== section) {
			skeletonSectionRef.current = section;
			setLoading(true);
		}

		database
			.listRecorrencias({
				userId: userData?.id ?? null,
				familyId: family?.id ?? null,
				visibilityScope: family?.id ? "all" : "mine",
			})
			.then((rows) => {
				if (active) setRecorrencias(Array.isArray(rows) ? rows : []);
			})
			.catch(() => {
				if (active) setRecorrencias([]);
			})
			.finally(() => {
				if (active) setLoading(false);
			});

		return () => {
			active = false;
		};
	}, [section, database, userData?.id, family?.id, familyReady, reloadKey]);

	return { recorrencias, loading };
}
