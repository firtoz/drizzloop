import {
	blob as sqliteBlob,
	integer as sqliteInteger,
	numeric as sqliteNumeric,
	real as sqliteReal,
	sqliteTable,
	text as sqliteText,
} from "drizzle-orm/sqlite-core";

type Branded<T, K extends string> = T & { __brand: K };

export type UserId = Branded<string, "UserId">;

export const usersTable = sqliteTable("users", {
	id: sqliteText("id").$type<UserId>().primaryKey(),
	name: sqliteText("name").notNull(),
	email: sqliteText("email").notNull().unique(),
	password: sqliteText("password").notNull(),
	age: sqliteInteger("age"),
	isActive: sqliteInteger("is_active", { mode: "boolean" }).default(true),
	profilePicture: sqliteBlob("profile_picture"),
	rating: sqliteNumeric("rating"),
	balance: sqliteReal("balance").default(0),
	lastLoginTimestamp: sqliteInteger("last_login_timestamp"),
	createdAt: sqliteInteger("created_at", { mode: "timestamp" })
		.notNull()
		.$defaultFn(() => new Date()),
});
