import type { Branded } from "./Branded";
import { crdtTable } from "./crdtTable";

export type UserId = Branded<string, "UserId">;

export const usersTable = crdtTable<UserId>()("users", ({ text }) => ({
	name: text("name").notNull(),
}));

const t = usersTable.$inferInsert;
