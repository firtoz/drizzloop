import sqlite3InitModule, {
	type Sqlite3Static,
	type Database,
} from "@sqlite.org/sqlite-wasm";
import { sql } from "drizzle-orm";

import { drizzleSqliteWasm } from "web-app/app/drizzleSqliteWasm";
import { migrate } from "web-app/app/utils/sqlite-wasm-migrator";
import migrations from "../drizzle/migrations";
import { type UserId, usersTable } from "./schema";

describe("SQLite WASM Migrations", () => {
	let sqlite3: Sqlite3Static;
	let sqliteDb: Database;

	beforeAll(async () => {
		sqlite3 = await sqlite3InitModule({
			// Silence SQLite logs
			print: () => {},
			printErr: console.error,
		});
	});

	beforeEach(() => {
		// Create a new in-memory database for each test
		sqliteDb = new sqlite3.oo1.DB(":memory:", "c");
	});

	afterEach(() => {
		// Close the database after each test
		sqliteDb.close();
	});

	test("should have valid migration files", () => {
		// Check that migrations object has the expected structure
		expect(migrations).toHaveProperty("journal");
		expect(migrations).toHaveProperty("migrations");
		expect(migrations.journal).toHaveProperty("entries");
		expect(Array.isArray(migrations.journal.entries)).toBe(true);
		expect(migrations.journal.entries.length).toBeGreaterThan(0);

		// Check that the first migration exists
		const firstMigrationKey = `m${migrations.journal.entries[0].idx.toString().padStart(4, "0")}`;
		expect(migrations.migrations).toHaveProperty(firstMigrationKey);

		// Check that the migration SQL contains expected table creation
		const migrationSQL = (migrations.migrations as Record<string, string>)[
			firstMigrationKey
		];
		expect(typeof migrationSQL).toBe("string");
		expect(migrationSQL).toContain("CREATE TABLE");
		expect(migrationSQL).toContain("`users`");
	});

	test("should apply actual drizzle migrations", async () => {
		// Initialize drizzle with the SQLite database
		const db = drizzleSqliteWasm(sqliteDb, {
			schema: {
				usersTable,
			},
		});

		// Apply migrations
		await migrate(db, migrations);

		// Verify migrations table was created
		const migrationsTableExists = sqliteDb.exec({
			sql: "SELECT name FROM sqlite_master WHERE type='table' AND name='__drizzle_migrations'",
			returnValue: "resultRows",
		});

		expect(migrationsTableExists.length).toBe(1);

		// Verify users table was created
		const usersTableExists = sqliteDb.exec({
			sql: "SELECT name FROM sqlite_master WHERE type='table' AND name='users'",
			returnValue: "resultRows",
		});

		expect(usersTableExists.length).toBe(1);

		// Insert a user to verify the table structure
		await db.insert(usersTable).values({
			id: "1" as UserId,
			name: "Test User",
			email: "test@example.com",
			password: "password123",
			age: 30,
			isActive: true,
		});

		// Query the user
		const user = await db.query.usersTable.findFirst({
			where: (users, { eq }) => eq(users.id, "1" as UserId),
		});

		expect(user).not.toBeNull();
		expect(user?.id).toBe("1");
		expect(user?.name).toBe("Test User");
	});

	test("should handle multiple migrations", async () => {
		// Initialize drizzle with the SQLite database
		const db = drizzleSqliteWasm(sqliteDb, {
			schema: {
				usersTable,
			},
		});

		// Create a mock migration config with multiple migrations
		const mockMigrationConfig = {
			journal: {
				entries: [
					{
						idx: 0,
						when: 1742000333611,
						tag: "0000_create_users_table",
						breakpoints: true,
					},
					{
						idx: 1,
						when: 1742000333612,
						tag: "0001_add_roles_column",
						breakpoints: true,
					},
				],
			},
			migrations: {
				m0000: `
					CREATE TABLE users (
						id TEXT PRIMARY KEY,
						name TEXT NOT NULL,
						email TEXT NOT NULL UNIQUE,
						password TEXT NOT NULL,
						age INTEGER,
						is_active INTEGER DEFAULT 1,
						profile_picture BLOB,
						rating NUMERIC,
						balance REAL DEFAULT 0,
						last_login_timestamp INTEGER,
						created_at INTEGER NOT NULL DEFAULT (unixepoch())
					);
				`,
				m0001: `
					ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user';
				`,
			},
		};

		// Apply migrations
		await migrate(db, mockMigrationConfig);

		// Verify migrations table was created
		const migrationsCount = sqliteDb.exec({
			sql: "SELECT COUNT(*) FROM __drizzle_migrations",
			returnValue: "resultRows",
		});

		expect(migrationsCount[0][0]).toBe(2);

		// Insert a user to verify the table structure including the new role column
		await db.insert(usersTable).values({
			id: "1" as UserId,
			name: "Test User",
			email: "test@example.com",
			password: "password123",
		});

		// Check if the role column exists
		const roleColumnExists = sqliteDb
			.exec({
				sql: "PRAGMA table_info(users)",
				returnValue: "resultRows",
			})
			.some((row) => row[1] === "role");

		expect(roleColumnExists).toBe(true);

		// Query the user with a custom SQL to get the role
		const userWithRole = sqliteDb.exec({
			sql: "SELECT id, name, role FROM users WHERE id = '1'",
			returnValue: "resultRows",
		});

		expect(userWithRole.length).toBe(1);
		expect(userWithRole[0][0]).toBe("1");
		expect(userWithRole[0][1]).toBe("Test User");
		expect(userWithRole[0][2]).toBe("user"); // Default role value
	});

	test("should not reapply existing migrations", async () => {
		// Initialize drizzle with the SQLite database
		const db = drizzleSqliteWasm(sqliteDb, {
			schema: {
				usersTable,
			},
		});

		// Apply migrations
		await migrate(db, migrations);

		// Get the count of migrations
		const initialMigrationsCount = sqliteDb.exec({
			sql: "SELECT COUNT(*) FROM __drizzle_migrations",
			returnValue: "resultRows",
		});

		expect(initialMigrationsCount[0][0]).toBe(1);

		// Apply the same migrations again
		await migrate(db, migrations);

		// Verify the migrations count hasn't changed
		const finalMigrationsCount = sqliteDb.exec({
			sql: "SELECT COUNT(*) FROM __drizzle_migrations",
			returnValue: "resultRows",
		});

		expect(finalMigrationsCount[0][0]).toBe(1);
	});
});
