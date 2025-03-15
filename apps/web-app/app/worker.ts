// In `worker.js`.
import sqlite3InitModule, {
	type Sqlite3Static,
	type Database,
} from "@sqlite.org/sqlite-wasm";
import * as schema from "schema/schema";
// @ts-expect-error
import migrations from "schema/migrations";
import { migrate } from "./utils/sqlite-wasm-migrator";
import { drizzleSqliteWasm } from "./drizzleSqliteWasm";

export const log = (...args: unknown[]) => {
	console.log(`[${new Date().toISOString()}]`, ...args);
	// postMessage({ type: "log", payload: args.join(" ") });
};
const error = (...args: unknown[]) => {
	console.error(`[${new Date().toISOString()}]`, ...args);
	// postMessage({ type: "error", payload: args.join(" ") });
};

const start = async (sqlite3: Sqlite3Static) => {
	log("Running SQLite3 version", sqlite3.version.libVersion);
	let sqliteDb: Database;
	if ("opfs" in sqlite3) {
		sqliteDb = new sqlite3.oo1.OpfsDb("/mydb.sqlite3");
		log("OPFS is available, created persisted database at", sqliteDb.filename);
	} else {
		sqliteDb = new sqlite3.oo1.DB("/mydb.sqlite3", "c");
		log("OPFS is not available, created transient database", sqliteDb.filename);
	}

	try {
		const db = drizzleSqliteWasm(sqliteDb, {
			schema,
		});

		log("Migrating...");
		await migrate(db, migrations, false);
		log("Migration complete");

		// Database is now ready for use
	} finally {
		sqliteDb.close();
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
