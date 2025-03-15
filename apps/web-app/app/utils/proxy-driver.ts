import { drizzle } from "drizzle-orm/sqlite-proxy";
import { usersTable } from "schema/schema";

const db = drizzle(
	async (sql, params, method) => {
		try {
			// const rows = await axios.post('http://localhost:3000/query', { sql, params, method });

			return { rows: [] };
		} catch (e: unknown) {
			if (e instanceof Error) {
				console.error("Error from sqlite proxy server: ", e.message);
			} else {
				console.error("Error from sqlite proxy server: ", e);
			}
			return { rows: [] };
		}
	},
	{
		schema: {
			usersTable,
		},
	},
);
