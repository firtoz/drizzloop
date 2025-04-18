/// <reference lib="webworker" />

import sqlite3InitModule, {
	type Sqlite3Static,
	type Database,
	type BindingSpec,
} from "@sqlite.org/sqlite-wasm";
import * as schema from "schema/schema";
import { drizzleSqliteWasm } from "./drizzleSqliteWasm";

export type WorkerMessage =
	| {
			type: "setup";
			dbName: string;
	  }
	| {
			type: "query";
			id: string;
			sql: string;
			params: BindingSpec;
			method: "run" | "all" | "values" | "get";
	  };

// Define types for diagnostics information
export type StorageDiagnostics = {
	isSecureContext: boolean;
	hasOPFS: boolean;
	opfsAccessible: boolean;
	hasFileSystem: boolean;
	hasStorage: boolean;
	hasStoragePersist: boolean;
	navigatorStorageEstimate: StorageEstimate | null;
	headers: {
		coep: string | null;
		coop: string | null;
	};
};

type StorageTransientStatusReason =
	| "indexeddb-error"
	| "not-secure-context"
	| "not-cross-origin-isolated";

// Define types for worker messages and status
export type WorkerStorageStatus =
	| {
			status: "persistent";
			diagnostics: StorageDiagnostics;
	  }
	| {
			status: "transient";
			reason: StorageTransientStatusReason;
			diagnostics: StorageDiagnostics;
	  };

export type WorkerResponse =
	| {
			id: string;
			type: "response";
			result: { rows: unknown[] | unknown[][] };
			error?: string;
	  }
	| {
			type: "log" | "error";
			payload: string;
	  }
	| {
			type: "storage-status";
			status: WorkerStorageStatus;
	  }
	| {
			type: "request-setup";
	  }
	| {
			type: "ready";
	  }
	| {
			type: "check-cross-origin-resources";
	  };

const sendMessage = (message: WorkerResponse) => {
	postMessage(message);
};

export const log = (...args: unknown[]) => {
	console.log(`[${new Date().toISOString()}]`, ...args);
	sendMessage({ type: "log", payload: args.join(" ") });
};

const error = (...args: unknown[]) => {
	console.error(`[${new Date().toISOString()}]`, ...args);
	sendMessage({ type: "error", payload: args.join(" ") });
};

let sqliteDb: Database | null = null;
let db: ReturnType<typeof drizzleSqliteWasm> | null = null;

const getDiagnostics = async (): Promise<StorageDiagnostics> => {
	const isSecureContext = self.isSecureContext;
	const hasOPFS = "storage" in navigator && "getDirectory" in navigator.storage;
	const hasFileSystem = "showOpenFilePicker" in self;
	const hasStorage = "storage" in navigator;
	const hasStoragePersist = "persist" in (navigator?.storage ?? {});

	// Test OPFS access directly
	let opfsAccessible = false;
	if (hasOPFS) {
		try {
			const root = await navigator.storage.getDirectory();
			// Try to create a test file
			const testFile = await root.getFileHandle("opfs-test.txt", {
				create: true,
			});
			opfsAccessible = true;
			log("OPFS direct test: Successfully created test file");
		} catch (e) {
			log(
				"OPFS direct test failed:",
				e instanceof Error ? e.message : String(e),
			);
		}
	}

	let navigatorStorageEstimate: StorageEstimate | null = null;
	if (hasStorage) {
		try {
			navigatorStorageEstimate = await navigator.storage.estimate();
		} catch (e) {
			console.error("Failed to get storage estimate:", e);
		}
	}

	// Check if cross-origin isolation is enabled
	const isCrossOriginIsolated = self.crossOriginIsolated;

	// Log detailed cross-origin isolation info
	log("Cross-Origin Isolation Status:");
	log("- self.crossOriginIsolated:", isCrossOriginIsolated);

	// Try to fetch the current page to check headers directly
	try {
		const response = await fetch(self.location.href);
		const coepHeader = response.headers.get("cross-origin-embedder-policy");
		const coopHeader = response.headers.get("cross-origin-opener-policy");
		const permissionsPolicyHeader = response.headers.get("permissions-policy");
		const corpHeader = response.headers.get("cross-origin-resource-policy");

		log("- Actual HTTP Headers (from fetch):");
		log("  - Cross-Origin-Embedder-Policy:", coepHeader || "not set");
		log("  - Cross-Origin-Opener-Policy:", coopHeader || "not set");
		log("  - Cross-Origin-Resource-Policy:", corpHeader || "not set");
		log("  - Permissions-Policy:", permissionsPolicyHeader || "not set");

		// Check if permissions policy might be blocking cross-origin-isolation
		if (permissionsPolicyHeader?.includes("cross-origin-isolated=()")) {
			log("  - WARNING: Permissions-Policy is blocking cross-origin-isolation");
		}
	} catch (e) {
		log(
			"- Failed to fetch headers:",
			e instanceof Error ? e.message : String(e),
		);
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
		opfsAccessible,
	};
};

// Try to request storage persistence
const requestStoragePersistence = async (): Promise<boolean> => {
	if (!("storage" in navigator && "persist" in navigator.storage)) {
		log("Storage persistence API is not available");
		return false;
	}

	try {
		// Check if already persistent
		const isPersisted = await navigator.storage.persisted();
		if (isPersisted) {
			log("Storage is already persistent");
			return true;
		}

		// Request persistence
		const persisted = await navigator.storage.persist();
		if (persisted) {
			log("Successfully requested storage persistence");
			return true;
		}

		log("Storage persistence request was denied");
		return false;
	} catch (e) {
		error("Error requesting storage persistence:", e);
		return false;
	}
};

// Try to run the check if we're in a browser context
try {
	if (typeof document !== "undefined") {
		// We can't access the document directly from a worker, so we need to send a message to the main thread
		sendMessage({ type: "check-cross-origin-resources" });
	}
} catch (e) {
	// Ignore errors, this is just a diagnostic
}

const start = async (sqlite3: Sqlite3Static, dbName: string) => {
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

	// Log OPFS status
	log("OPFS API available:", diagnostics.hasOPFS ? "Yes" : "No");
	log("OPFS directly accessible:", diagnostics.opfsAccessible ? "Yes" : "No");
	log("SQLite OPFS support:", "opfs" in sqlite3 ? "Yes" : "No");

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
	log("Cross-Origin Isolated:", self.crossOriginIsolated ? "Yes" : "No");

	// Try to request persistence
	const persistenceRequested = await requestStoragePersistence();
	log(
		"Storage persistence requested:",
		persistenceRequested ? "Successful" : "Failed",
	);

	let storageStatus: WorkerStorageStatus;

	const dbFileName = `${dbName}.sqlite3`;

	if ("opfs" in sqlite3) {
		sqliteDb = new sqlite3.oo1.OpfsDb(dbFileName);
		log("OPFS is available, created persisted database at", sqliteDb.filename);
		storageStatus = {
			status: "persistent",
			diagnostics,
		};
	} else {
		sqliteDb = new sqlite3.oo1.DB(dbFileName, "c");
		log("OPFS is not available, created transient database", sqliteDb.filename);

		let reason: StorageTransientStatusReason;

		if (!diagnostics.isSecureContext) {
			reason = "not-secure-context";
			log("OPFS unavailable reason: Not in a secure context (HTTPS required)");
		} else if (!self.crossOriginIsolated) {
			reason = "not-cross-origin-isolated";
			log("OPFS unavailable reason: Site is not cross-origin isolated");
			log(
				"Required headers: Cross-Origin-Embedder-Policy: require-corp and Cross-Origin-Opener-Policy: same-origin",
			);
		} else {
			reason = "indexeddb-error";
			log(
				"OPFS unavailable reason: Unknown (possibly browser support or permissions)",
			);
		}

		storageStatus = {
			status: "transient",
			reason,
			diagnostics,
		};
	}

	// Send storage status to main thread
	sendMessage({ type: "storage-status", status: storageStatus });

	try {
		db = drizzleSqliteWasm(sqliteDb, {
			schema,
		});

		// Database is now ready for use
		log("Database ready for use");

		// Notify that the worker is loaded
		sendMessage({ type: "ready" });
	} catch (err) {
		if (err instanceof Error) {
			error(err.name, err.message);
		} else {
			error(err);
		}
	}
};

let sqliteInstance: Sqlite3Static | null = null;

const handleMessage = async (event: MessageEvent) => {
	const message = event.data as WorkerMessage;

	if (message.type === "setup") {
		if (!sqliteInstance) {
			error("Wait for request-setup!");
		} else {
			start(sqliteInstance, message.dbName);
		}
		return;
	}

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

		sendMessage(response);
	} catch (e) {
		const errorMessage = e instanceof Error ? e.message : String(e);

		const response: WorkerResponse = {
			id: message.id,
			type: "response",
			result: { rows: [] },
			error: errorMessage,
		};

		sendMessage(response);
		error("Error executing query:", errorMessage);
	}
};

self.addEventListener("message", handleMessage);

log("Loading and initializing SQLite3 module...");
sqlite3InitModule({
	print: log,
	printErr: error,
}).then((sqlite3) => {
	sqliteInstance = sqlite3;

	log("Done initializing. Running...");
	try {
		sendMessage({
			type: "request-setup",
		});
		// start(sqlite3);
	} catch (err) {
		if (err instanceof Error) {
			error(err.name, err.message);
		} else {
			error(err);
		}
	}
});
