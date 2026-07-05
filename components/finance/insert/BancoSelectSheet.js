import React, { useEffect, useMemo, useState } from "react";
import { SearchableSelectSheet } from "@/components/ui/search-select";
import { createBancoCatalogoRepository } from "@/services/database/bancoCatalogoRepository";
import { createBancoRepository } from "@/services/database/bancoRepository";

const catalogRepo = createBancoCatalogoRepository();
const bancoRepo = createBancoRepository();

// Seletor de banco para o lançamento: lista as contas do usuário separando
// conta corrente de cartão de crédito, e permite adicionar uma conta nova a partir do catálogo.
export default function BancoSelectSheet({
	isOpen,
	onClose,
	onSelect,
	colors,
	actionSheetContentStyle,
	userId = null,
	familyId = null,
}) {
	const [catalog, setCatalog] = useState([]);
	const [userBancos, setUserBancos] = useState([]);

	useEffect(() => {
		if (!isOpen) return;
		async function load() {
			await catalogRepo.fetchAndCacheCatalog().catch(() => {});
			const [catRows, bancoRows] = await Promise.all([
				catalogRepo.listCatalog().catch(() => []),
				bancoRepo
					.listBancos({ visibilityScope: "mine", userId: userId ?? undefined })
					.catch(() => []),
			]);
			// Seta os dois juntos para que o catálogo (fonte da logo) nunca fique
			// vazio enquanto a lista de bancos já está renderizada e selecionável.
			setCatalog(Array.isArray(catRows) ? catRows : []);
			setUserBancos(Array.isArray(bancoRows) ? bancoRows : []);
		}
		load();
	}, [isOpen, userId]);

	const matchCatalogLogo = (nome) => {
		const target = String(nome).trim().toLowerCase();
		// 1) match exato; 2) maior nome de catálogo contido no nome do banco
		//    (ex.: "Nubank Cartão" -> "Nubank"), evitando casar nomes muito curtos por engano.
		let item = catalog.find((c) => c.nome.trim().toLowerCase() === target);
		if (!item) {
			item = catalog
				.filter((c) => {
					const cn = c.nome.trim().toLowerCase();
					return cn.length >= 3 && (target.includes(cn) || cn.includes(target));
				})
				.sort((a, b) => b.nome.length - a.nome.length)[0];
		}
		return item
			? { logo_url: item.logo_url ?? null, logo_local_path: item.logo_local_path ?? null }
			: { logo_url: null, logo_local_path: null };
	};

	const bancoFlags = (b) => {
		const legacyCartao = b.tipo === "cartao_credito";
		return {
			isCorrente: b.is_corrente != null ? Number(b.is_corrente) === 1 : !legacyCartao,
			isCartao: b.is_cartao != null ? Number(b.is_cartao) === 1 : legacyCartao,
		};
	};

	const { options, bancoById, catalogById } = useMemo(() => {
		const correntes = [];
		const cartoes = [];
		const byId = new Map();

		for (const b of userBancos) {
			const { isCorrente, isCartao } = bancoFlags(b);
			byId.set(String(b.id_banco), b);
			const both = isCorrente && isCartao;
			if (isCorrente) {
				correntes.push({ id: `banco:${b.id_banco}:corrente`, label: both ? `${b.nome} · Conta` : b.nome });
			}
			if (isCartao) {
				cartoes.push({ id: `banco:${b.id_banco}:cartao`, label: `${b.nome} · Cartão` });
			}
		}

		const registeredNames = new Set(
			userBancos.map((b) => b.nome.trim().toLowerCase())
		);
		const catById = new Map();
		const unregistered = [];
		for (const item of catalog) {
			if (registeredNames.has(item.nome.trim().toLowerCase())) continue;
			catById.set(String(item.id), item);
			unregistered.push({ id: `cat:${item.id}`, label: item.nome, variant: "catalog" });
		}

		return {
			options: [...correntes, ...cartoes, ...unregistered],
			bancoById: byId,
			catalogById: catById,
		};
	}, [userBancos, catalog]);

	const handleSelect = (rawId) => {
		const id = String(rawId);
		if (id.startsWith("banco:")) {
			const [, bancoId, side] = id.split(":");
			const banco = bancoById.get(bancoId);
			if (banco) onSelect({ ...banco, side: side === "cartao" ? "cartao" : "corrente", ...matchCatalogLogo(banco.nome) });
			return;
		}
		if (id.startsWith("cat:")) {
			const item = catalogById.get(id.slice("cat:".length));
			if (!item) return;
			// Não cria o banco agora — só descreve. A criação acontece ao salvar a transação.
			onSelect({
				id_banco: null,
				nome: item.nome,
				cor_hex: item.cor_hex ?? "#6B7280",
				is_corrente: 1,
				is_cartao: 0,
				dia_fechamento: null,
				dia_vencimento: null,
				side: "corrente",
				isNewFromCatalog: true,
				...matchCatalogLogo(item.nome),
			});
		}
	};

	return (
		<SearchableSelectSheet
			isOpen={isOpen}
			onClose={onClose}
			onSelect={handleSelect}
			options={options}
			searchPlaceholder="Buscar conta ou cartão..."
			themeColors={colors}
			autoFocusSearch
			fixedHeight={false}
			actionSheetContentStyle={actionSheetContentStyle}
			inputContainerStyle={{
				borderColor: colors?.borderStrong,
				backgroundColor: colors?.surfaceMuted,
			}}
		/>
	);
}
