declare module "wa-sqlite" {
	export class SQLiteError extends Error {
		code: number;
		constructor(message: string, code: number);
	}

	export interface Statement {
		bind(params: unknown[]): Promise<void>;
		get(): Promise<Record<string, unknown> | undefined>;
		all(): Promise<Record<string, unknown>[]>;
		finalize(): Promise<void>;
	}

	export interface DB {
		exec(sql: string, params?: unknown[]): Promise<void>;
		prepare(sql: string): Promise<Statement>;
	}

	export interface SQLiteAPI {
		vfs_register(vfs: unknown, makeDefault?: boolean): void;
		open_v2(
			filename: string,
			flags?: number,
			vfsName?: string,
		): Promise<number>;
		prepare_v2(
			db: number,
			sql: string,
		): Promise<{ stmt: number; sql: number } | null>;
		step(stmt: number): Promise<number>;
		column(stmt: number, iCol: number): unknown;
		column_count(stmt: number): number;
		column_name(stmt: number, iCol: number): string;
		column_type(stmt: number, iCol: number): number;
		finalize(stmt: number): Promise<number>;
		close(db: number): Promise<void>;
		bind_parameter_count(stmt: number): number;
		bind_text(stmt: number, i: number, value: string): Promise<number>;
		bind_blob(stmt: number, i: number, value: Uint8Array): Promise<number>;
		bind_double(stmt: number, i: number, value: number): Promise<number>;
		bind_int(stmt: number, i: number, value: number): Promise<number>;
		bind_null(stmt: number, i: number): Promise<number>;
		reset(stmt: number): Promise<number>;
		changes(db: number): number;
		exec(
			db: number,
			sql: string,
			callback?: (
				row: Record<string, unknown>,
				columns: string[],
			) => Promise<void>,
		): Promise<void>;
	}

	export const SQLITE_OPEN_CREATE: number;
	export const SQLITE_OPEN_READWRITE: number;
	export const SQLITE_OK: number;
	export const SQLITE_ROW: number;
	export const SQLITE_DONE: number;

	export const SQLITE_INTEGER: number;
	export const SQLITE_FLOAT: number;
	export const SQLITE_TEXT: number;
	export const SQLITE_BLOB: number;
	export const SQLITE_NULL: number;

	export function Factory(module: unknown): SQLiteAPI;
}

declare module "wa-sqlite/dist/wa-sqlite-async.mjs" {
	interface SQLiteOptions {
		locateFile?: (file: string) => string;
	}
	const SQLiteESMFactory: (options?: SQLiteOptions) => Promise<unknown>;
	export default SQLiteESMFactory;
}

declare module "wa-sqlite/src/examples/IDBBatchAtomicVFS.js" {
	interface VFSOptions {
		durability?: "default" | "strict" | "relaxed";
		purge?: "deferred" | "manual";
		purgeAtLeast?: number;
	}

	export class IDBBatchAtomicVFS {
		constructor(idbDatabaseName?: string, options?: VFSOptions);
	}
}

declare module "*.wasm?url" {
	const url: string;
	export default url;
}
