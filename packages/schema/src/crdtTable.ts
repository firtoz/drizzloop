import type { BuildColumns } from "drizzle-orm";
import {
	type SQLiteColumnBuilderBase,
	type SQLiteTableExtraConfigValue,
	sqliteTable,
} from "drizzle-orm/sqlite-core";
import type { SQLiteColumnBuilders } from "drizzle-orm/sqlite-core/columns/all";
import type { Branded } from "./Branded";

const crdtColumns = <TId extends Branded<string, string>>({
	text,
	integer,
}: SQLiteColumnBuilders) => {
	return {
		id: text("id").$type<TId>().primaryKey(),
		createdAt: integer("created_at", { mode: "timestamp" })
			.notNull()
			.$defaultFn(() => new Date()),
		updatedAt: integer("updated_at", { mode: "timestamp" })
			.notNull()
			.$defaultFn(() => new Date()),
		deletedAt: integer("deleted_at", { mode: "timestamp" }),
		version: integer("version", { mode: "number" }).notNull().default(0),
	};
};

type BaseCRDTColumns<TId extends Branded<string, string>> = Record<
	string,
	SQLiteColumnBuilderBase
> & {
	[T in keyof ReturnType<typeof crdtColumns<TId>>]?: never;
};

type FullCrdtColumns<
	TId extends Branded<string, string>,
	TColumnsMap extends BaseCRDTColumns<TId>,
> = Omit<TColumnsMap, keyof ReturnType<typeof crdtColumns<TId>>> &
	ReturnType<typeof crdtColumns<TId>>;

export const crdtTable = <TId extends Branded<string, string>>() => {
	return <TTableName extends string, TColumnsMap extends BaseCRDTColumns<TId>>(
		name: TTableName,
		columns: (columnTypes: SQLiteColumnBuilders) => TColumnsMap,
		extraConfig?: (
			self: BuildColumns<
				TTableName,
				FullCrdtColumns<TId, TColumnsMap>,
				"sqlite"
			>,
		) => SQLiteTableExtraConfigValue[],
	) => {
		return sqliteTable<TTableName, FullCrdtColumns<TId, TColumnsMap>>(
			name,
			(columnTypes) => {
				return {
					...columns(columnTypes),
					...crdtColumns<TId>(columnTypes),
				};
			},
			extraConfig,
		);
	};
};
