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
			categoria        TEXT NOT NULL,
			id_pessoa        INTEGER,
			pessoa           TEXT,
			id_imobilizado   INTEGER,
			id_banco         INTEGER,
			family_id        INTEGER,
			is_family_shared INTEGER NOT NULL DEFAULT 0,
			user_id          TEXT,
			data_transacao   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
			data_vencimento  TEXT,
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
}
