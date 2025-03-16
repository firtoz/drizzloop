/// <reference lib="webworker" />

import sqlite3InitModule, {
	type Sqlite3Static,
	type Database,
} from "@sqlite.org/sqlite-wasm";
// @ts-expect-error
import migrations from "schema/migrations";
import * as schema from "schema/schema";
import { drizzleSqliteWasm } from "./drizzleSqliteWasm";
import { migrate } from "./utils/sqlite-wasm-migrator";

// Define types for diagnostics information
type Diagnostics = {
	isSecureContext: boolean;
	hasOPFS: boolean;
	hasFileSystem: boolean;
	hasStorage: boolean;
	hasStoragePersist: boolean;
	navigatorStorageEstimate: StorageEstimate | null;
	headers: {
		coep: string | null;
		coop: string | null;
	};
};

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

const getDiagnostics = async (): Promise<Diagnostics> => {
	const isSecureContext = self.isSecureContext;
	const hasOPFS = "getDirectory" in (navigator?.storage?.getDirectory ?? {});
	const hasFileSystem = "showOpenFilePicker" in self;
	const hasStorage = "storage" in navigator;
	const hasStoragePersist = "persist" in (navigator?.storage ?? {});

	let navigatorStorageEstimate: StorageEstimate | null = null;
	if (hasStorage) {
		try {
			navigatorStorageEstimate = await navigator.storage.estimate();
		} catch (e) {
			console.error("Failed to get storage estimate:", e);
		}
	}

	const headers = {
		coep: self.crossOriginIsolated ? "require-corp" : null,
		coop: self.crossOriginIsolated ? "same-origin" : null,
	};

	return {
		isSecureContext,
		hasOPFS,
		hasFileSystem,
		hasStorage,
		hasStoragePersist,
		navigatorStorageEstimate,
		headers,
	};
};

const start = async (sqlite3: Sqlite3Static) => {
	log("Running SQLite3 version", sqlite3.version.libVersion);

	// Get diagnostics information
	const diagnostics = await getDiagnostics();

	// Log diagnostic results
	log("Diagnostics results:");
	log(
		"Security Context:",
		diagnostics.isSecureContext ? "Secure" : "Not Secure",
	);
	log(
		"Storage APIs:",
		[
			diagnostics.hasOPFS ? "OPFS" : null,
			diagnostics.hasFileSystem ? "File System" : null,
			diagnostics.hasStorage ? "Storage" : null,
			diagnostics.hasStoragePersist ? "Persistence" : null,
		]
			.filter(Boolean)
			.join(", ") || "None available",
	);

	if (diagnostics.navigatorStorageEstimate) {
		const { quota, usage } = diagnostics.navigatorStorageEstimate;
		const usedMB = Math.round(usage ? usage / (1024 * 1024) : 0);
		const quotaMB = Math.round(quota ? quota / (1024 * 1024) : 0);
		log(
			"Storage Usage:",
			`${usedMB}MB of ${quotaMB}MB (${quota ? Math.round(((usage || 0) / quota) * 100) : 0}%)`,
		);
	}

	log("Security Headers:");
	log("- Cross-Origin-Embedder-Policy:", diagnostics.headers.coep || "not set");
	log("- Cross-Origin-Opener-Policy:", diagnostics.headers.coop || "not set");

	const storageStatus: {
		status: "persistent" | "transient";
		reason?: string;
		diagnostics?: Diagnostics;
	} = {
		status: "transient",
		diagnostics,
	};

	if ("opfs" in sqlite3) {
		sqliteDb = new sqlite3.oo1.OpfsDb("/mydb.sqlite3");
		log("OPFS is available, created persisted database at", sqliteDb.filename);
		storageStatus.status = "persistent";
	} else {
		sqliteDb = new sqlite3.oo1.DB("/mydb.sqlite3", "c");
		log("OPFS is not available, created transient database", sqliteDb.filename);
		storageStatus.status = "transient";
		storageStatus.reason = "indexeddb-error";
	}

	// Send storage status to main thread
	self.postMessage(storageStatus);

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
