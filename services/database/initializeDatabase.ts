import { type SQLiteDatabase } from 'expo-sqlite';
import { initializeSQLite } from './initializeSQLite';

export async function initializeDatabase(database?: SQLiteDatabase) {
	if (!database) throw new Error('SQLite database instance required on mobile');
	return initializeSQLite(database);
}
