import type { DrizzleConfig } from "drizzle-orm";
import { drizzle } from "drizzle-orm/sqlite-proxy";

type WorkerMessage = {
	id: string;
	type: "query";
	sql: string;
	params: unknown[];
	method: "run" | "all" | "values" | "get";
};

type WorkerResponse = {
	id: string;
	type: "response";
	result: { rows: unknown[] | unknown[][] };
	error?: string;
};

type PendingRequest = {
	resolve: (value: {
		rows: unknown[] | unknown[][];
	}) => void;
	reject: (reason: Error) => void;
};

export const drizzleWorkerProxy = <
	TSchema extends Record<string, unknown> = Record<string, never>,
>(
	worker: Worker,
	config?: DrizzleConfig<TSchema>,
) => {
	// Create a map to store pending requests
	const pendingRequests = new Map<string, PendingRequest>();

	// Set up a single message handler for all requests
	worker.addEventListener("message", (event: MessageEvent) => {
		const data = event.data as WorkerResponse;

		if (data.type === "response" && pendingRequests.has(data.id)) {
			const { resolve, reject } = pendingRequests.get(
				data.id,
			) as PendingRequest;
			pendingRequests.delete(data.id);

			if (data.error) {
				reject(new Error(data.error));
			} else {
				resolve(data.result);
			}
		}
	});

	const executeQuery = async (
		sql: string,
		params: unknown[],
		method: "run" | "all" | "values" | "get",
	) => {
		return new Promise<{ rows: unknown[] | unknown[][] }>((resolve, reject) => {
			const id = crypto.randomUUID();

			// Store the promise callbacks in the map
			pendingRequests.set(id, { resolve, reject });

			const message: WorkerMessage = {
				id,
				type: "query",
				sql,
				params,
				method,
			};

			worker.postMessage(message);
		});
	};

	const db = drizzle(async (sql, params, method) => {
		return executeQuery(sql, params, method);
	}, config);

	// Add helper methods for raw SQL execution
	return Object.assign(db, {
		// Execute a query that doesn't return rows (INSERT, UPDATE, DELETE, etc.)
		run: async (sql: string, params: unknown[] = []) => {
			await executeQuery(sql, params, "run");
		},

		// Execute a query and return all rows
		all: async <T = Record<string, unknown>>(
			sql: string,
			params: unknown[] = [],
		): Promise<T[]> => {
			const result = await executeQuery(sql, params, "all");
			return result.rows as unknown as T[];
		},

		// Execute a query and return a single row
		get: async <T = Record<string, unknown>>(
			sql: string,
			params: unknown[] = [],
		): Promise<T | undefined> => {
			const result = await executeQuery(sql, params, "get");
			if (Array.isArray(result.rows) && result.rows.length > 0) {
				return result.rows as unknown as T;
			}
			return undefined;
		},

		// Execute a query and return values (array of arrays)
		values: async <T = unknown[][]>(
			sql: string,
			params: unknown[] = [],
		): Promise<T> => {
			const result = await executeQuery(sql, params, "values");
			return result.rows as unknown as T;
		},
	});
};
