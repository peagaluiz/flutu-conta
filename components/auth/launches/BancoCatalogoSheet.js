import React, { useState, useMemo, useEffect } from "react";
import { SearchableSelectSheet } from "@/components/ui/search-select";
import { createBancoCatalogoRepository } from "@/services/database/bancoCatalogoRepository";
import { createBancoRepository } from "@/services/database/bancoRepository";

const catalogRepo = createBancoCatalogoRepository();
const bancoRepo = createBancoRepository();

export default function BancoCatalogoSheet({
    isOpen,
    onClose,
    onSelect,
    colors,
    actionSheetContentStyle,
}) {
    const [catalog, setCatalog] = useState([]);
    const [userBancoNames, setUserBancoNames] = useState(new Set());

    useEffect(() => {
        if (!isOpen) return;
        async function load() {
            await catalogRepo.fetchAndCacheCatalog().catch(() => {});
            const [rows, userBancos] = await Promise.all([
                catalogRepo.listCatalog().catch(() => []),
                bancoRepo.listBancos({ visibilityScope: "mine" }).catch(() => []),
            ]);
            setCatalog(Array.isArray(rows) ? rows : []);
            const names = new Set(
                (userBancos || []).map((b) => b.nome.trim().toLowerCase())
            );
            setUserBancoNames(names);
        }
        load();
    }, [isOpen]);

    const options = useMemo(() => {
        const registered = [];
        const unregistered = [];
        for (const item of catalog) {
            const option = { id: item.id, label: item.nome };
            if (userBancoNames.has(item.nome.trim().toLowerCase())) {
                registered.push(option);
            } else {
                unregistered.push({ ...option, variant: "catalog" });
            }
        }
        return [...registered, ...unregistered];
    }, [catalog, userBancoNames]);

    return (
        <SearchableSelectSheet
            isOpen={isOpen}
            onClose={onClose}
            onSelect={(id) => {
                const item = catalog.find((b) => String(b.id) === String(id));
                if (item) onSelect(item);
            }}
            options={options}
            searchPlaceholder="Buscar banco..."
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
