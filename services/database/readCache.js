const values = new Map();
const inFlight = new Map();
const generations = new Map();

function stableValue(value) {
	if (Array.isArray(value)) return value.map(stableValue);
	if (!value || typeof value !== "object") return value;
	return Object.keys(value)
		.sort()
		.reduce((result, key) => {
			const item = value[key];
			if (item !== undefined) result[key] = stableValue(item);
			return result;
		}, {});
}

export function buildReadKey(namespace, params = {}) {
	return `${namespace}:${JSON.stringify(stableValue(params))}`;
}

export async function readThrough(key, loader, { maxAgeMs = Infinity } = {}) {
	const cached = values.get(key);
	if (cached && Date.now() - cached.createdAt <= maxAgeMs) return cached.value;
	if (inFlight.has(key)) return inFlight.get(key);
	const generation = generations.get(key) ?? 0;

	let promise;
	promise = Promise.resolve()
		.then(loader)
		.then((value) => {
			if ((generations.get(key) ?? 0) === generation) {
				values.set(key, { value, createdAt: Date.now() });
			}
			return value;
		})
		.finally(() => {
			if (inFlight.get(key) === promise) inFlight.delete(key);
		});

	inFlight.set(key, promise);
	return promise;
}

export function invalidateReadCache(...namespaces) {
	const prefixes = namespaces.map((namespace) => `${namespace}:`);
	const keys = new Set([...values.keys(), ...inFlight.keys()]);
	for (const key of keys) {
		if (!prefixes.some((prefix) => key.startsWith(prefix))) continue;
		values.delete(key);
		inFlight.delete(key);
		generations.set(key, (generations.get(key) ?? 0) + 1);
	}
}

export function clearReadCache() {
	values.clear();
	inFlight.clear();
	generations.clear();
}
