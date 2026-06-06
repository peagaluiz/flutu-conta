import React, { useMemo } from "react";
import { UserRound } from "lucide-react-native";
import { SearchableSelect } from "@/components/ui/search-select";
import { useDatabase } from "@/hooks/useDatabase";

export function SearchableSelectPessoas(props) {
    const database = useDatabase();

    const [pessoas, setPessoas] = React.useState([]);

    React.useEffect(() => {
        let mounted = true;

        (async () => {
            try {
                const data = await database.listPessoas();
                if (mounted) setPessoas(data ?? []);
            } catch (e) {
                console.log("erro listPessoas:", e);
            }
        })();

        return () => {
            mounted = false;
        };
    }, [database]);

    const pessoasOptions = useMemo(() => {
        return pessoas.map((pessoa) => ({
            id: pessoa.nome,
            label: pessoa.nome,
        }));
    }, [pessoas]);

    return (
        <SearchableSelect
            {...props}
            options={pessoasOptions}
            Icon={props.Icon || UserRound}
            allowCreateOption={true}
            getCreateLabel={(v) => `Criar pessoa "${v}"`}
        />
    );
}