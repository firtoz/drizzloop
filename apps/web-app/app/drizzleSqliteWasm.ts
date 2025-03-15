import type { Database } from "@sqlite.org/sqlite-wasm";
import type { DrizzleConfig } from "drizzle-orm";
import { drizzle } from "drizzle-orm/sqlite-proxy";

export const drizzleSqliteWasm = <
	TSchema extends Record<string, unknown> = Record<string, never>,
>(
	sqliteDb: Database,
	config?: DrizzleConfig<TSchema>,
) => {
	return drizzle(async (sql, params, method) => {
		// (parameter) method: "run" | "all" | "values" | "get"
		try {
			if (method === "run") {
				// For INSERT, UPDATE, DELETE operations
				sqliteDb.exec({
					sql,
					bind: params,
					callback: () => {},
				});
				return { rows: [] };
			}

			if (method === "get") {
				// For getting a single row
				const columnNames: string[] = [];
				let rowData: unknown[] = [];

				// Get column names and data in one go
				sqliteDb.exec({
					sql,
					bind: params,
					columnNames: columnNames, // Pass the array to be filled
					callback: (row) => {
						if (Array.isArray(row)) {
							// Store the first row's values
							rowData = row;
						} else {
							// Convert object to array if needed
							rowData = columnNames.map((col) => row[col]);
						}
					},
				});

				// For get method, return a single array of values
				return { rows: rowData };
			}

			if (method === "all" || method === "values") {
				// For getting multiple rows
				const columnNames: string[] = [];
				const rowsData: unknown[][] = [];

				// Get column names and data in one go
				sqliteDb.exec({
					sql,
					bind: params,
					columnNames: columnNames, // Pass the array to be filled
					callback: (row) => {
						if (Array.isArray(row)) {
							// Convert all values to strings
							rowsData.push(row);
						} else {
							// Convert object to array if needed
							rowsData.push(columnNames.map((col) => row[col]));
						}
					},
				});

				// For all/values methods, return an array of arrays
				return { rows: rowsData };
			}

			return { rows: [] };
		} catch (e: unknown) {
			if (e instanceof Error) {
				console.error("Error executing SQLite query: ", e.message);
			} else {
				console.error("Error executing SQLite query: ", e);
			}
			return { rows: [] };
		}
	}, config);
};
