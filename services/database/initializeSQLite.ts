// services/database/initializeSQLite.ts
import { type SQLiteDatabase } from 'expo-sqlite';

export async function initializeSQLite(database: SQLiteDatabase) {
	await database.execAsync('PRAGMA foreign_keys = ON;');

	await database.execAsync(`
		CREATE TABLE IF NOT EXISTS banco (
			id_banco         INTEGER PRIMARY KEY AUTOINCREMENT,
			remote_id        INTEGER,
			nome             TEXT NOT NULL,
			cor_hex          TEXT NOT NULL DEFAULT '#6B7280',
			user_id          TEXT,
			family_id        INTEGER,
			is_family_shared INTEGER NOT NULL DEFAULT 0,
			created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
			updated_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
			data_sync        TEXT,
			sync_status      TEXT NOT NULL DEFAULT 'pending',
			synced           INTEGER NOT NULL DEFAULT 0,
			deleted          INTEGER NOT NULL DEFAULT 0
		);
	`);

	await database.execAsync(`
		CREATE TABLE IF NOT EXISTS pessoa (
			id_pessoa        INTEGER PRIMARY KEY AUTOINCREMENT,
			remote_id        INTEGER,
			nome             TEXT NOT NULL,
			family_id        INTEGER,
			is_family_shared INTEGER NOT NULL DEFAULT 0,
			user_id          TEXT,
			created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
			updated_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
			data_sync        TEXT,
			sync_status      TEXT NOT NULL DEFAULT 'pending',
			synced           INTEGER NOT NULL DEFAULT 0,
			deleted          INTEGER NOT NULL DEFAULT 0
		);
	`);

	await database.execAsync(`
		CREATE TABLE IF NOT EXISTS tipo_imobilizado (
			id_tipo_imobilizado INTEGER PRIMARY KEY AUTOINCREMENT,
			remote_id           INTEGER,
			nome                TEXT NOT NULL,
			created_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
			updated_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
			data_sync           TEXT,
			sync_status         TEXT NOT NULL DEFAULT 'pending',
			synced              INTEGER NOT NULL DEFAULT 0,
			deleted             INTEGER NOT NULL DEFAULT 0
		);
	`);

	await database.execAsync(`
		CREATE TABLE IF NOT EXISTS imobilizado (
			id_imobilizado      INTEGER PRIMARY KEY AUTOINCREMENT,
			remote_id           INTEGER,
			id_tipo_imobilizado INTEGER NOT NULL,
			codigo              TEXT NOT NULL,
			descricao           TEXT NOT NULL,
			family_id           INTEGER,
			is_family_shared    INTEGER NOT NULL DEFAULT 0,
			user_id             TEXT,
			status              INTEGER,
			created_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
			updated_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
			data_sync           TEXT,
			sync_status         TEXT NOT NULL DEFAULT 'pending',
			synced              INTEGER NOT NULL DEFAULT 0,
			deleted             INTEGER NOT NULL DEFAULT 0,
			FOREIGN KEY(id_tipo_imobilizado) REFERENCES tipo_imobilizado(id_tipo_imobilizado)
		);
	`);

	await database.execAsync(`
		CREATE TABLE IF NOT EXISTS transacoes (
			id_transacao     INTEGER PRIMARY KEY AUTOINCREMENT,
			remote_id        INTEGER,
			tipo             TEXT NOT NULL,
			valor            REAL NOT NULL,
			id_pessoa        INTEGER,
			pessoa           TEXT,
			id_imobilizado   INTEGER,
			id_banco         INTEGER,
			family_id        INTEGER,
			is_family_shared INTEGER NOT NULL DEFAULT 0,
			user_id          TEXT,
			data_transacao   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
			data_vencimento  TEXT,
			data_baixa       TEXT,
			status           TEXT NOT NULL DEFAULT 'pendente',
			observacao       TEXT,
			json             TEXT,
			created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
			updated_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
			data_sync        TEXT,
			sync_status      TEXT NOT NULL DEFAULT 'pending',
			synced           INTEGER NOT NULL DEFAULT 0,
			deleted          INTEGER NOT NULL DEFAULT 0,
			FOREIGN KEY(id_pessoa)      REFERENCES pessoa(id_pessoa),
			FOREIGN KEY(id_imobilizado) REFERENCES imobilizado(id_imobilizado),
			FOREIGN KEY(id_banco)       REFERENCES banco(id_banco)
		);
	`);

	await database.execAsync(`
		CREATE TABLE IF NOT EXISTS recorrencias (
			id_recurrencia    INTEGER PRIMARY KEY AUTOINCREMENT,
			remote_id         INTEGER,
			uuid              TEXT NOT NULL UNIQUE,
			status            TEXT NOT NULL DEFAULT 'ativa',
			frequency         TEXT NOT NULL,
			interval_days     INTEGER,
			base_due_date     TEXT NOT NULL,
			next_due_date     TEXT NOT NULL,
			end_date          TEXT,
			template_json     TEXT NOT NULL,
			occurrences_count INTEGER NOT NULL DEFAULT 0,
			last_generated_at TEXT,
			user_id           TEXT,
			family_id         INTEGER,
			is_family_shared  INTEGER NOT NULL DEFAULT 0,
			created_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
			updated_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
			sync_status       TEXT NOT NULL DEFAULT 'pending',
			synced            INTEGER NOT NULL DEFAULT 0,
			deleted           INTEGER NOT NULL DEFAULT 0
		);
	`);

	await database.execAsync(`
		CREATE TABLE IF NOT EXISTS recorrencia_transacoes (
			id_recurrencia_transacao INTEGER PRIMARY KEY AUTOINCREMENT,
			id_recurrencia           INTEGER NOT NULL,
			id_transacao             INTEGER NOT NULL UNIQUE,
			due_date                 TEXT NOT NULL,
			sequence                 INTEGER NOT NULL,
			created_at               TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
			FOREIGN KEY(id_recurrencia) REFERENCES recorrencias(id_recurrencia),
			FOREIGN KEY(id_transacao)   REFERENCES transacoes(id_transacao),
			UNIQUE(id_recurrencia, due_date)
		);
	`);

	await database.execAsync(`
		CREATE TABLE IF NOT EXISTS cartao_faturas (
			id_fatura              INTEGER PRIMARY KEY AUTOINCREMENT,
			remote_id              INTEGER,
			id_banco               INTEGER NOT NULL,
			mes_referencia         TEXT NOT NULL,
			data_fechamento        TEXT,
			data_vencimento        TEXT,
			valor_total            REAL NOT NULL DEFAULT 0,
			status                 TEXT NOT NULL DEFAULT 'aberta',
			id_transacao_pagamento INTEGER,
			family_id              INTEGER,
			is_family_shared       INTEGER NOT NULL DEFAULT 0,
			user_id                TEXT,
			created_at             TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
			updated_at             TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
			data_sync              TEXT,
			sync_status            TEXT NOT NULL DEFAULT 'pending',
			synced                 INTEGER NOT NULL DEFAULT 0,
			deleted                INTEGER NOT NULL DEFAULT 0,
			FOREIGN KEY(id_banco) REFERENCES banco(id_banco)
		);
	`);

	await database.execAsync(`
		CREATE TABLE IF NOT EXISTS banco_catalogo (
			id              INTEGER PRIMARY KEY,
			nome            TEXT NOT NULL,
			cor_hex         TEXT,
			logo_url        TEXT,
			logo_local_path TEXT,
			ativo           INTEGER NOT NULL DEFAULT 1,
			cached_at       TEXT NOT NULL
		);
	`);

	await database.execAsync(`
		CREATE TABLE IF NOT EXISTS categoria_catalogo (
			id       INTEGER PRIMARY KEY,
			nome     TEXT    NOT NULL,
			icone    TEXT,
			cor_hex  TEXT    NOT NULL DEFAULT '#6B7280',
			ordem    INTEGER NOT NULL DEFAULT 0,
			ativo    INTEGER NOT NULL DEFAULT 1,
			cached_at TEXT   NOT NULL
		);
	`);

	// Migrações para bases já existentes — sempre antes dos CREATE INDEX
	const safeAddColumn = async (sql: string) => {
		try {
			await database.execAsync(sql);
		} catch {
			// Ignora quando coluna já existe
		}
	};

	await safeAddColumn("ALTER TABLE transacoes ADD COLUMN created_at TEXT;");
	await safeAddColumn("ALTER TABLE transacoes ADD COLUMN updated_at TEXT;");
	await safeAddColumn("ALTER TABLE transacoes ADD COLUMN family_id INTEGER;");
	await safeAddColumn("ALTER TABLE transacoes ADD COLUMN is_family_shared INTEGER DEFAULT 0;");
	await safeAddColumn("ALTER TABLE transacoes ADD COLUMN user_id TEXT;");
	await safeAddColumn("ALTER TABLE transacoes ADD COLUMN id_banco INTEGER;");
	await safeAddColumn("ALTER TABLE transacoes ADD COLUMN data_baixa TEXT;");
	await safeAddColumn("ALTER TABLE transacoes ADD COLUMN id_categoria INTEGER;");
	await safeAddColumn("ALTER TABLE transacoes ADD COLUMN id_fatura INTEGER;");
	await safeAddColumn("ALTER TABLE transacoes ADD COLUMN parcela_atual INTEGER;");
	await safeAddColumn("ALTER TABLE transacoes ADD COLUMN parcela_total INTEGER;");
	await safeAddColumn("ALTER TABLE transacoes ADD COLUMN ofx_fitid TEXT;");

	await safeAddColumn("ALTER TABLE banco ADD COLUMN tipo TEXT DEFAULT 'corrente';");
	await safeAddColumn("ALTER TABLE banco ADD COLUMN dia_fechamento INTEGER;");
	await safeAddColumn("ALTER TABLE banco ADD COLUMN dia_vencimento INTEGER;");

	// Marcadores independentes: um banco pode ser conta corrente e/ou cartão de crédito
	await safeAddColumn("ALTER TABLE banco ADD COLUMN is_corrente INTEGER DEFAULT 1;");
	// Backfill roda só na 1ª criação de is_cartao (deriva do tipo legado), evitando resetar flags em re-execuções
	let bancoCartaoAdded = false;
	try {
		await database.execAsync("ALTER TABLE banco ADD COLUMN is_cartao INTEGER DEFAULT 0;");
		bancoCartaoAdded = true;
	} catch {
		// coluna já existe
	}
	if (bancoCartaoAdded) {
		await database.execAsync(
			"UPDATE banco SET is_cartao = 1, is_corrente = 0 WHERE tipo = 'cartao_credito';"
		);
	}

	// Remove coluna legada — SQLite 3.35+ suporta DROP COLUMN (expo-sqlite v15+)
	const safeDropColumn = async (sql: string) => {
		try {
			await database.execAsync(sql);
		} catch {
			// Ignora quando coluna já foi removida ou não existe
		}
	};
	await safeDropColumn("ALTER TABLE transacoes DROP COLUMN categoria;");

	await safeAddColumn("ALTER TABLE pessoa ADD COLUMN family_id INTEGER;");
	await safeAddColumn("ALTER TABLE pessoa ADD COLUMN is_family_shared INTEGER DEFAULT 0;");
	await safeAddColumn("ALTER TABLE pessoa ADD COLUMN user_id TEXT;");
	await safeAddColumn("ALTER TABLE pessoa ADD COLUMN created_at TEXT;");
	await safeAddColumn("ALTER TABLE pessoa ADD COLUMN updated_at TEXT;");

	await safeAddColumn("ALTER TABLE imobilizado ADD COLUMN family_id INTEGER;");
	await safeAddColumn("ALTER TABLE imobilizado ADD COLUMN is_family_shared INTEGER DEFAULT 0;");
	await safeAddColumn("ALTER TABLE imobilizado ADD COLUMN user_id TEXT;");
	await safeAddColumn("ALTER TABLE imobilizado ADD COLUMN created_at TEXT;");
	await safeAddColumn("ALTER TABLE imobilizado ADD COLUMN updated_at TEXT;");

	await safeAddColumn("ALTER TABLE tipo_imobilizado ADD COLUMN created_at TEXT;");
	await safeAddColumn("ALTER TABLE tipo_imobilizado ADD COLUMN updated_at TEXT;");

	await safeAddColumn("ALTER TABLE recorrencias ADD COLUMN remote_id INTEGER;");
	await safeAddColumn("ALTER TABLE recorrencias ADD COLUMN skip_non_working INTEGER DEFAULT 0;");
	await safeAddColumn("ALTER TABLE recorrencias ADD COLUMN skip_direction TEXT;");
	await safeAddColumn("ALTER TABLE recorrencias ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'pending';");
	await safeAddColumn("ALTER TABLE recorrencias ADD COLUMN synced INTEGER NOT NULL DEFAULT 0;");

	await safeAddColumn("ALTER TABLE recorrencia_transacoes ADD COLUMN synced INTEGER NOT NULL DEFAULT 0;");

	await database.execAsync("DROP INDEX IF EXISTS idx_recorrencia_transacoes_recurrencia;");

	await database.execAsync("CREATE INDEX IF NOT EXISTS idx_transacoes_sync           ON transacoes(sync_status, synced);");
	await database.execAsync("CREATE INDEX IF NOT EXISTS idx_transacoes_user           ON transacoes(user_id, deleted);");
	await database.execAsync("CREATE INDEX IF NOT EXISTS idx_transacoes_family         ON transacoes(family_id, is_family_shared);");
	await database.execAsync("CREATE INDEX IF NOT EXISTS idx_pessoa_sync               ON pessoa(sync_status, synced);");
	await database.execAsync("CREATE INDEX IF NOT EXISTS idx_imobilizado_sync          ON imobilizado(sync_status, synced);");
	await database.execAsync("CREATE INDEX IF NOT EXISTS idx_banco_user                ON banco(user_id, deleted);");
	await database.execAsync("CREATE INDEX IF NOT EXISTS idx_banco_family              ON banco(family_id, is_family_shared);");
	await database.execAsync("CREATE INDEX IF NOT EXISTS idx_transacoes_banco          ON transacoes(id_banco);");
	await database.execAsync("CREATE INDEX IF NOT EXISTS idx_recorrencias_status_due   ON recorrencias(status, next_due_date);");
	await database.execAsync("CREATE INDEX IF NOT EXISTS idx_recorrencias_visibility   ON recorrencias(user_id, family_id);");
	await database.execAsync("CREATE INDEX IF NOT EXISTS idx_recorrencia_transacoes_fk ON recorrencia_transacoes(id_recurrencia);");
	await database.execAsync("CREATE INDEX IF NOT EXISTS idx_transacoes_id_categoria   ON transacoes(id_categoria);");
	await database.execAsync("CREATE INDEX IF NOT EXISTS idx_transacoes_fatura         ON transacoes(id_fatura);");
	await database.execAsync("CREATE INDEX IF NOT EXISTS idx_cartao_faturas_banco      ON cartao_faturas(id_banco, mes_referencia);");
	await database.execAsync("CREATE INDEX IF NOT EXISTS idx_cartao_faturas_sync       ON cartao_faturas(sync_status, synced);");
}
