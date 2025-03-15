/// <reference lib="webworker" />

import sqlite3InitModule, {
	type Sqlite3Static,
	type Database,
} from "@sqlite.org/sqlite-wasm";
import * as schema from "schema/schema";
// @ts-expect-error
import migrations from "schema/migrations";
import { migrate } from "./utils/sqlite-wasm-migrator";
import { drizzleSqliteWasm } from "./drizzleSqliteWasm";

type WorkerMessage = {
	id: string;
	type: "query";
	sql: string;
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	params: any[];
	method: "run" | "all" | "values" | "get";
};

type WorkerResponse = {
	id: string;
	type: "response";
	result: { rows: unknown[] | unknown[][] };
	error?: string;
};

export const log = (...args: unknown[]) => {
	console.log(`[${new Date().toISOString()}]`, ...args);
	postMessage({ type: "log", payload: args.join(" ") });
};

const error = (...args: unknown[]) => {
	console.error(`[${new Date().toISOString()}]`, ...args);
	postMessage({ type: "error", payload: args.join(" ") });
};

let sqliteDb: Database | null = null;
let db: ReturnType<typeof drizzleSqliteWasm> | null = null;

const start = async (sqlite3: Sqlite3Static) => {
	log("Running SQLite3 version", sqlite3.version.libVersion);

	if ("opfs" in sqlite3) {
		sqliteDb = new sqlite3.oo1.OpfsDb("/mydb.sqlite3");
		log("OPFS is available, created persisted database at", sqliteDb.filename);
	} else {
		sqliteDb = new sqlite3.oo1.DB("/mydb.sqlite3", "c");
		log("OPFS is not available, created transient database", sqliteDb.filename);
	}

	try {
		db = drizzleSqliteWasm(sqliteDb, {
			schema,
		});

		log("Migrating...");
		await migrate(db, migrations, false);
		log("Migration complete");

		// Database is now ready for use
		log("Database ready for use");

		// Set up message handler for queries
		self.addEventListener("message", handleMessage);
	} catch (err) {
		if (err instanceof Error) {
			error(err.name, err.message);
		} else {
			error(err);
		}
	}
};

const handleMessage = async (event: MessageEvent) => {
	const message = event.data as WorkerMessage;

	if (message.type !== "query" || !sqliteDb) {
		return;
	}

	try {
		const { id, sql, params, method } = message;

		// Execute the query using the SQLite database
		let result: { rows: unknown[] | unknown[][] } = { rows: [] };

		if (method === "run") {
			// For INSERT, UPDATE, DELETE operations
			sqliteDb.exec({
				sql,
				bind: params,
				callback: () => {},
			});
			result = { rows: [] };
		} else if (method === "get") {
			// For getting a single row
			const columnNames: string[] = [];
			let rowData: unknown[] = [];

			// Get column names and data in one go
			sqliteDb.exec({
				sql,
				bind: params,
				columnNames: columnNames,
				callback: (row) => {
					if (Array.isArray(row)) {
						rowData = row;
					} else if (row) {
						rowData = columnNames.map((col) => row[col]);
					}
				},
			});

			result = { rows: rowData };
		} else if (method === "all" || method === "values") {
			// For getting multiple rows
			const columnNames: string[] = [];
			const rowsData: unknown[][] = [];

			sqliteDb.exec({
				sql,
				bind: params,
				columnNames: columnNames,
				callback: (row) => {
					if (Array.isArray(row)) {
						rowsData.push(row);
					} else if (row) {
						rowsData.push(columnNames.map((col) => row[col]));
					}
				},
			});

			result = { rows: rowsData };
		}

		// Send the response back
		const response: WorkerResponse = {
			id,
			type: "response",
			result,
		};

		self.postMessage(response);
	} catch (e) {
		const errorMessage = e instanceof Error ? e.message : String(e);

		const response: WorkerResponse = {
			id: message.id,
			type: "response",
			result: { rows: [] },
			error: errorMessage,
		};

		self.postMessage(response);
		error("Error executing query:", errorMessage);
	}
};

log("Loading and initializing SQLite3 module...");
sqlite3InitModule({
	print: log,
	printErr: error,
}).then((sqlite3) => {
	log("Done initializing. Running...");
	try {
		start(sqlite3);
	} catch (err) {
		if (err instanceof Error) {
			error(err.name, err.message);
		} else {
			error(err);
		}
	}
});

// Notify that the worker is loaded
self.postMessage({ type: "ready" });
