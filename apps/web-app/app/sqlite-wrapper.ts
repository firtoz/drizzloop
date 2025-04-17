import type { DB, SQLiteAPI, Statement } from "wa-sqlite";
import { SQLITE_DONE, SQLITE_ROW } from "wa-sqlite";

// Simple logging utility
const log = (...args: unknown[]) => {
	console.log("[SQLiteWrapper]", ...args);
};

export class SQLiteWrapper implements DB {
	private dbHandle: number;
	private sqlite3: SQLiteAPI;

	constructor(dbHandle: number, sqlite3: SQLiteAPI) {
		this.dbHandle = dbHandle;
		this.sqlite3 = sqlite3;
		log("Initialized with database handle:", dbHandle);
	}

	async exec(sql: string, params?: unknown[]): Promise<void> {
		log("Executing SQL:", sql, "with params:", params);

		// If no params, use direct execution
		if (!params?.length) {
			try {
				await this.sqlite3.exec(this.dbHandle, sql);
				log("Direct execution completed successfully");
				return;
			} catch (error) {
				log("Error during direct execution:", error);
				throw error;
			}
		}

		// If we have params, use prepared statement
		const stmt = await this.prepare(sql);
		try {
			log("Binding parameters...");
			await stmt.bind(params);
			log("Parameters bound successfully");

			let status: number;
			do {
				status = await this.sqlite3.step(stmt as unknown as number);
				log(
					"Step result status:",
					status,
					status === SQLITE_ROW
						? "(SQLITE_ROW)"
						: status === SQLITE_DONE
							? "(SQLITE_DONE)"
							: "(other)",
				);
			} while (status === SQLITE_ROW);

			// SQLITE_DONE is the expected completion state
			if (status !== SQLITE_DONE) {
				throw new Error(`SQLite error: ${status}`);
			}
			log("Execution completed successfully");
		} finally {
			log("Finalizing statement");
			await stmt.finalize();
		}
	}

	async prepare(sql: string): Promise<Statement> {
		log("Preparing SQL:", sql);
		let result: { stmt: number; sql: number } | null = null;
		try {
			result = await this.sqlite3.prepare_v2(this.dbHandle, sql);
		} catch (error) {
			log("Error during prepare:", error);
			throw error; // Propagate all errors, including completion states
		}

		if (!result) {
			log("Failed to prepare statement - no result returned");
			throw new Error("Failed to prepare statement");
		}

		log("Statement prepared successfully");

		const { stmt } = result;
		let finalized = false;
		const sqlite3 = this.sqlite3;

		const statement: Statement = {
			async bind(params: unknown[]): Promise<void> {
				if (finalized) throw new Error("Statement is finalized");
				log("Binding parameters:", params);

				const count = sqlite3.bind_parameter_count(stmt);
				if (params.length !== count) {
					throw new Error(`Expected ${count} parameters, got ${params.length}`);
				}

				for (let i = 0; i < params.length; i++) {
					const value = params[i];
					const idx = i + 1; // SQLite parameters are 1-based
					log(`Binding parameter ${idx}:`, value);

					if (value === null) {
						await sqlite3.bind_null(stmt, idx);
					} else if (typeof value === "string") {
						await sqlite3.bind_text(stmt, idx, value);
					} else if (typeof value === "number") {
						if (Number.isInteger(value)) {
							await sqlite3.bind_int(stmt, idx, value);
						} else {
							await sqlite3.bind_double(stmt, idx, value);
						}
					} else if (value instanceof Uint8Array) {
						await sqlite3.bind_blob(stmt, idx, value);
					} else {
						throw new Error(`Unsupported parameter type: ${typeof value}`);
					}
				}
				log("All parameters bound successfully");
			},

			async get(): Promise<Record<string, unknown> | undefined> {
				if (finalized) throw new Error("Statement is finalized");

				const status = await sqlite3.step(stmt);
				log(
					"Get step result status:",
					status,
					status === SQLITE_ROW
						? "(SQLITE_ROW)"
						: status === SQLITE_DONE
							? "(SQLITE_DONE)"
							: "(other)",
				);

				if (status === SQLITE_ROW) {
					const columnCount = sqlite3.column_count(stmt);
					const row: Record<string, unknown> = {};
					for (let i = 0; i < columnCount; i++) {
						const name = sqlite3.column_name(stmt, i);
						const value = sqlite3.column(stmt, i);
						row[name] = value;
					}
					log("Retrieved row:", row);
					return row;
				}
				// SQLITE_DONE is the expected completion state when no more rows
				if (status !== SQLITE_DONE) {
					throw new Error(`SQLite error: ${status}`);
				}
				log("No more rows available");
				return undefined;
			},

			async all(): Promise<Record<string, unknown>[]> {
				if (finalized) throw new Error("Statement is finalized");
				log("Fetching all rows");

				const rows: Record<string, unknown>[] = [];
				while (true) {
					const row = await statement.get();
					if (!row) break;
					rows.push(row);
				}
				log("Retrieved all rows:", rows);
				return rows;
			},

			async finalize(): Promise<void> {
				if (finalized) return;
				log("Finalizing statement");
				finalized = true;
				await sqlite3.finalize(stmt);
				log("Statement finalized successfully");
			},
		};

		return statement;
	}

	async close(): Promise<void> {
		log("Closing database connection");
		await this.sqlite3.close(this.dbHandle);
		log("Database connection closed");
	}
}
