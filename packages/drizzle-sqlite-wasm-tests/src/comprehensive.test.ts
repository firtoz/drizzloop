import sqlite3InitModule, {
	type Sqlite3Static,
	type Database,
} from "@sqlite.org/sqlite-wasm";
import { eq } from "drizzle-orm";

import { usersTable, type UserId } from "./schema";
import { drizzleSqliteWasm } from "web-app/app/drizzleSqliteWasm";
import migrations from "../drizzle/migrations";
import { migrate } from "web-app/app/utils/sqlite-wasm-migrator";
import type { SqliteRemoteDatabase } from "drizzle-orm/sqlite-proxy";

describe("Comprehensive SQLite WASM Tests", () => {
	let sqlite3: Sqlite3Static;
	let sqliteDb: Database;
	let db: SqliteRemoteDatabase<{
		usersTable: typeof usersTable;
	}>;

	beforeAll(async () => {
		sqlite3 = await sqlite3InitModule({
			// Silence SQLite logs
			print: () => {},
			printErr: console.error,
		});
	});

	beforeEach(async () => {
		// Create a new in-memory database for each test
		sqliteDb = new sqlite3.oo1.DB(":memory:", "c");

		db = drizzleSqliteWasm(sqliteDb, {
			schema: {
				usersTable,
			},
		});

		// Apply migrations
		await migrate(db, migrations);
	});

	afterEach(() => {
		// Close the database after each test
		sqliteDb.close();
	});

	test("should run all query types", async () => {
		// Test DELETE (clear any existing data)
		await db.delete(usersTable);

		// Verify table is empty
		const emptyCheck = await db.query.usersTable.findMany();
		expect(emptyCheck.length).toBe(0);

		// Test INSERT
		await db.insert(usersTable).values({
			id: "1" as UserId,
			name: "Test User",
			email: "test@example.com",
			password: "password123",
			age: 30,
			isActive: true,
			profilePicture: new Uint8Array([
				116, 101, 115, 116, 32, 105, 109, 97, 103, 101, 32, 100, 97, 116, 97,
			]), // "test image data" as bytes
			rating: "4.75",
			balance: 1000.5,
			lastLoginTimestamp: Date.now(),
		});

		await db.insert(usersTable).values({
			id: "2" as UserId,
			name: "Another User",
			email: "another@example.com",
			password: "password456",
			age: 25,
			isActive: false,
			rating: "3.50",
			balance: 500.25,
			lastLoginTimestamp: Date.now() - 86400000, // 1 day ago
		});

		await db.insert(usersTable).values({
			id: "3" as UserId,
			name: "Third User",
			email: "third@example.com",
			password: "password789",
			age: 40,
			isActive: true,
			balance: 2500.75,
			lastLoginTimestamp: Date.now() - 172800000, // 2 days ago
		});

		// Verify insert count
		const insertCheck = await db.query.usersTable.findMany();
		expect(insertCheck.length).toBe(3);

		// Test GET method (single row)
		const singleUser = await db.query.usersTable.findFirst({
			where: (users, { eq }) => eq(users.id, "1" as UserId),
		});

		// Verify get result - only check basic fields
		expect(singleUser).not.toBeNull();
		expect(singleUser?.id).toBe("1");
		expect(singleUser?.name).toBe("Test User");
		expect(singleUser?.email).toBe("test@example.com");
		expect(singleUser?.password).toBe("password123");
		expect(singleUser?.age).toBe(30);
		expect(singleUser?.isActive).toBe(true);
		expect(singleUser?.rating).toBe(4.75);
		expect(singleUser?.balance).toBe(1000.5);

		// Test UPDATE
		await db
			.update(usersTable)
			.set({
				name: "Updated User",
			})
			.where(eq(usersTable.id, "1" as UserId));

		// Verify update
		const updatedUser = await db.query.usersTable.findFirst({
			where: (users, { eq }) => eq(users.id, "1" as UserId),
		});

		expect(updatedUser?.id).toBe("1");
		expect(updatedUser?.name).toBe("Updated User");
		expect(updatedUser?.email).toBe("test@example.com");
		expect(updatedUser?.password).toBe("password123");

		// Test ALL method (multiple rows)
		const allUsers = await db.query.usersTable.findMany();
		expect(allUsers.length).toBe(3);

		// Test filtering with WHERE clause
		const filteredUsers = await db.query.usersTable.findMany({
			where: (users, { like }) => like(users.email, "%example.com"),
		});
		expect(filteredUsers.length).toBe(3);

		// Test ORDER BY
		const orderedUsers = await db.query.usersTable.findMany({
			orderBy: (users, { desc }) => [desc(users.name)],
		});
		expect(orderedUsers.length).toBe(3);
		expect(orderedUsers[0].name).toBe("Updated User");

		// Test LIMIT
		const limitedUsers = await db.query.usersTable.findMany({
			limit: 2,
		});
		expect(limitedUsers.length).toBe(2);

		// Test complex query
		const complexResult = await db.query.usersTable.findMany({
			where: (users, { eq, or, like }) =>
				or(eq(users.id, "1" as UserId), like(users.email, "%another%")),
			orderBy: (users, { asc }) => [asc(users.id)],
			limit: 5,
		});
		expect(complexResult.length).toBe(2);

		// Test count
		const count = await db.$count(usersTable);
		expect(count).toBe(3);

		// Test count with WHERE
		const countWithWhere = await db.$count(
			usersTable,
			eq(usersTable.id, "1" as UserId),
		);
		expect(countWithWhere).toBe(1);

		// Test filtering by different data types

		// Test filtering by integer (age)
		const ageFilteredUsers = await db.query.usersTable.findMany({
			where: (users, { gt }) => gt(users.age, 25),
		});
		expect(ageFilteredUsers.length).toBe(2);

		// Test filtering by boolean (isActive)
		const activeUsers = await db.query.usersTable.findMany({
			where: (users, { eq }) => eq(users.isActive, true),
		});
		expect(activeUsers.length).toBe(2);

		// Test filtering by real (balance)
		const highBalanceUsers = await db.query.usersTable.findMany({
			where: (users, { gt }) => gt(users.balance, 1000),
		});
		expect(highBalanceUsers.length).toBe(2);

		// Test ordering by numeric (rating)
		const ratedUsers = await db.query.usersTable.findMany({
			orderBy: (users, { desc }) => [desc(users.rating)],
			where: (users, { isNotNull }) => isNotNull(users.rating),
		});
		expect(ratedUsers.length).toBe(2);
		expect(ratedUsers[0].id).toBe("1");

		// Test query with specific columns
		const partialUsers = await db.query.usersTable.findMany({
			columns: {
				id: true,
				name: true,
				email: true,
			},
		});
		expect(partialUsers.length).toBe(3);
		expect(Object.keys(partialUsers[0]).sort()).toEqual(
			["id", "name", "email"].sort(),
		);

		// Test timestamp field
		const userWithTimestamp = await db.query.usersTable.findFirst({
			where: (users, { eq }) => eq(users.id, "1" as UserId),
			columns: {
				id: true,
				createdAt: true,
			},
		});
		expect(userWithTimestamp?.createdAt).toBeDefined();

		// Test returning clause with update
		const returnedUser = await db
			.update(usersTable)
			.set({
				name: "Returned User",
			})
			.where(eq(usersTable.id, "1" as UserId))
			.returning({
				id: usersTable.id,
				name: usersTable.name,
				email: usersTable.email,
			});

		expect(returnedUser.length).toBe(1);
		expect(returnedUser[0]).toEqual({
			id: "1",
			name: "Returned User",
			email: "test@example.com",
		});
	});
});
