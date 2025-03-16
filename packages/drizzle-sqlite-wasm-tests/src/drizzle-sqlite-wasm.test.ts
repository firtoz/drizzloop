import sqlite3InitModule, {
	type Sqlite3Static,
	type Database,
} from "@sqlite.org/sqlite-wasm";
import { eq } from "drizzle-orm";

import { drizzleSqliteWasm } from "web-app/app/drizzleSqliteWasm";
import { type UserId, usersTable } from "./schema";

describe("drizzle-sqlite-wasm", () => {
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

	test("should create and query a database", async () => {
		// Initialize drizzle with the SQLite database
		const db = drizzleSqliteWasm(sqliteDb, {
			schema: {
				usersTable,
			},
		});

		// Create the users table
		sqliteDb.exec(`
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
				created_at INTEGER NOT NULL
			)
		`);

		// Insert a user
		await db.insert(usersTable).values({
			id: "1" as UserId,
			name: "Test User",
			email: "test@example.com",
			password: "password123",
			age: 30,
			isActive: true,
			profilePicture: new Uint8Array([116, 101, 115, 116]), // "test" as bytes
			rating: "4.75",
			balance: 1000.5,
			lastLoginTimestamp: Date.now(),
		});

		// Query the user
		const user = await db.query.usersTable.findFirst({
			where: (users, { eq }) => eq(users.id, "1" as UserId),
		});

		// Verify the user data
		expect(user).not.toBeNull();
		expect(user?.id).toBe("1");
		expect(user?.name).toBe("Test User");
		expect(user?.email).toBe("test@example.com");
		expect(user?.password).toBe("password123");
		expect(user?.age).toBe(30);
		expect(user?.isActive).toBe(true);
		expect(user?.rating).toBe(4.75);
		expect(user?.balance).toBe(1000.5);
	});

	test("should handle all CRUD operations", async () => {
		// Initialize drizzle with the SQLite database
		const db = drizzleSqliteWasm(sqliteDb, {
			schema: {
				usersTable,
			},
		});

		// Create the users table
		sqliteDb.exec(`
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
				created_at INTEGER NOT NULL
			)
		`);

		// INSERT
		await db.insert(usersTable).values({
			id: "1" as UserId,
			name: "Test User",
			email: "test@example.com",
			password: "password123",
			age: 30,
			isActive: true,
		});

		// SELECT
		let user = await db.query.usersTable.findFirst({
			where: (users, { eq }) => eq(users.id, "1" as UserId),
		});

		expect(user?.name).toBe("Test User");

		// UPDATE
		await db
			.update(usersTable)
			.set({ name: "Updated User" })
			.where(eq(usersTable.id, "1" as UserId));

		user = await db.query.usersTable.findFirst({
			where: (users, { eq }) => eq(users.id, "1" as UserId),
		});

		expect(user?.name).toBe("Updated User");

		// DELETE
		await db.delete(usersTable).where(eq(usersTable.id, "1" as UserId));

		user = await db.query.usersTable.findFirst({
			where: (users, { eq }) => eq(users.id, "1" as UserId),
		});

		// The user should be null or have no properties after deletion
		expect(user?.id).toBeUndefined();
	});

	test("should handle complex queries", async () => {
		// Initialize drizzle with the SQLite database
		const db = drizzleSqliteWasm(sqliteDb, {
			schema: {
				usersTable,
			},
		});

		// Create the users table
		sqliteDb.exec(`
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
				created_at INTEGER NOT NULL
			)
		`);

		// Insert multiple users
		await db.insert(usersTable).values([
			{
				id: "1" as UserId,
				name: "User One",
				email: "one@example.com",
				password: "password1",
				age: 25,
				isActive: true,
				balance: 1000,
			},
			{
				id: "2" as UserId,
				name: "User Two",
				email: "two@example.com",
				password: "password2",
				age: 30,
				isActive: false,
				balance: 2000,
			},
			{
				id: "3" as UserId,
				name: "User Three",
				email: "three@example.com",
				password: "password3",
				age: 35,
				isActive: true,
				balance: 3000,
			},
		]);

		// Test filtering
		const activeUsers = await db.query.usersTable.findMany({
			where: (users, { eq }) => eq(users.isActive, true),
		});

		expect(activeUsers.length).toBe(2);

		// Test ordering
		const orderedUsers = await db.query.usersTable.findMany({
			orderBy: (users, { desc }) => [desc(users.age)],
		});

		expect(orderedUsers[0].age).toBe(35);
		expect(orderedUsers[1].age).toBe(30);
		expect(orderedUsers[2].age).toBe(25);

		// Test limit and offset
		const limitedUsers = await db.query.usersTable.findMany({
			limit: 2,
		});

		expect(limitedUsers.length).toBe(2);

		// Test complex where conditions
		const filteredUsers = await db.query.usersTable.findMany({
			where: (users, { and, gt, eq }) =>
				and(gt(users.age, 25), eq(users.isActive, true)),
		});

		expect(filteredUsers.length).toBe(1);
		expect(filteredUsers[0].id).toBe("3");
	});
});
