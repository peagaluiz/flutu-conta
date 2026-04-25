import { Platform } from "react-native";
import { openDatabaseSync } from "expo-sqlite";

const rawDb = Platform.OS !== "web" ? openDatabaseSync("dev") : null;

let operationQueue: Promise<unknown> = Promise.resolve();

function wrapDbMethod<T extends (...args: any[]) => Promise<any>>(method: T): T {
	return ((...args: Parameters<T>) => {
		const execute = () => method(...args);
		const result = operationQueue.then(execute, execute) as ReturnType<T>;
		operationQueue = result.then(
			() => undefined,
			() => undefined
		);
		return result;
	}) as unknown as T;
}

if (rawDb) {
	rawDb.execAsync = wrapDbMethod(rawDb.execAsync.bind(rawDb));
	rawDb.getFirstAsync = wrapDbMethod(rawDb.getFirstAsync.bind(rawDb));
	rawDb.getAllAsync = wrapDbMethod(rawDb.getAllAsync.bind(rawDb));
	rawDb.runAsync = wrapDbMethod(rawDb.runAsync.bind(rawDb));
}

export const db = rawDb;

export function nowISO() {
	return new Date().toISOString();
}
