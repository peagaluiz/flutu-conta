import type { SyncTableName } from "@/services/database/sync/summary";

// Descreve uma entidade sincronizável: como a linha local vira payload remoto,
// como a linha remota é gravada localmente, e o que fazer quando ela é excluída.

export type UnlinkSpec = {
	// Tabela remota que referencia esta entidade e precisa ser desvinculada antes do delete.
	table: string;
	// Coluna FK na tabela acima (também usada no filtro pelo remote_id).
	column: string;
	// Campos extras a gravar junto do null da FK (ex.: preservar o nome da pessoa).
	extraFields?: (localRow: any) => Record<string, any>;
};

export type SyncModel = {
	table: SyncTableName;
	idColumn: string;
	remotePk: string;
	// "hard": DELETE remoto. "soft": UPDATE deleted = 1.
	deleteMode: "hard" | "soft";
	// Acrescenta updated_at ao UPDATE de subida.
	touchUpdatedAt?: boolean;
	unlinks?: UnlinkSpec[];
	toRemotePayload: (localRow: any) => Promise<any> | any;
	// Grava uma linha remota no banco local (direção de descida).
	fromRemote: (remoteRow: any) => Promise<any>;
};
