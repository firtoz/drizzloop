// import sqlite3InitModule, { type Sqlite3Static } from "@sqlite.org/sqlite-wasm";
import { useEffect, useState } from "react";
import { useMemo } from "react";
import MyWorker from "../worker?worker";
import { drizzleWorkerProxy } from "../drizzleWorkerProxy";
import * as schema from "schema/schema";

// // const worker = new MyWorker()

// const mainPre = document.querySelector(".main");
// const workerPre = document.querySelector(".worker");

// const log = (...args: unknown[]) => {
// 	if (!mainPre) return;
// 	console.log(...args);
// 	mainPre.textContent += `${args.join(" ")}\n`;
// };
// const error = (...args: unknown[]) => {
// 	if (!mainPre) return;
// 	console.error(...args);
// 	mainPre.textContent += `${args.join(" ")}\n`;
// };

// const workerLog = (...args: unknown[]) => {
// 	if (!workerPre) return;
// 	console.log(...args);
// 	workerPre.textContent += `${args.join(" ")}\n`;
// };
// const workerError = (...args: unknown[]) => {
// 	if (!workerPre) return;
// 	console.error(...args);
// 	workerPre.textContent += `${args.join(" ")}\n`;
// };

// const start = (sqlite3: Sqlite3Static) => {
// 	log("Running SQLite3 version", sqlite3.version.libVersion);
// 	const db = new sqlite3.oo1.DB("/mydb.sqlite3", "ct");
// 	try {
// 		log("Creating a table...");
// 		db.exec("CREATE TABLE IF NOT EXISTS t(a,b)");
// 		log("Insert some data using exec()...");
// 		for (let i = 20; i <= 25; ++i) {
// 			db.exec({
// 				sql: "INSERT INTO t(a,b) VALUES (?,?)",
// 				bind: [i, i * 2],
// 			});
// 		}
// 		log("Query data with exec()...");
// 		db.exec({
// 			sql: "SELECT a FROM t ORDER BY a LIMIT 3",
// 			callback: (row) => {
// 				log(row);
// 			},
// 		});
// 	} finally {
// 		db.close();
// 	}
// };

// log("Loading and initializing SQLite3 module...");
// sqlite3InitModule({
// 	print: log,
// 	printErr: error,
// }).then((sqlite3) => {
// 	try {
// 		log("Done initializing. Running demo...");
// 		start(sqlite3);
// 	} catch (err) {
// 		if (err instanceof Error) {
// 			error(err.name, err.message);
// 		} else {
// 			error(err);
// 		}
// 	}
// });

// const worker = new MyWorker();
// worker.onmessage = (e) => {
// 	e.data.type === "log"
// 		? workerLog(e.data.payload)
// 		: workerError(e.data.payload);
// };

const TestInner = () => {
	const [logs, setLogs] = useState<string[]>([]);
	const [isReady, setIsReady] = useState(false);
	const [testResult, setTestResult] = useState<string>("");

	const worker = useMemo(() => new MyWorker(), []);
	const db = useMemo(() => {
		if (!isReady) return null;
		return drizzleWorkerProxy(worker, { schema });
	}, [worker, isReady]);

	useEffect(() => {
		const abortController = new AbortController();
		const handleMessage = (e: MessageEvent) => {
			const data = e.data;

			if (data.type === "log" || data.type === "error") {
				setLogs((prev) => [...prev, data.payload]);
			} else if (data.type === "ready") {
				setIsReady(true);
			}
		};

		worker.addEventListener("message", handleMessage, {
			signal: abortController.signal,
		});

		return () => {
			abortController.abort();
		};
	}, [worker]);

	const runTestQuery = async () => {
		if (!db) return;

		try {
			// Example: Create a test table
			await db.delete(schema.usersTable);

			// Insert some data
			await db.insert(schema.usersTable).values({
				id: "1" as schema.UserId,
				name: `Test Item 1: ${Date.now()}`,
			});
			await db.insert(schema.usersTable).values({
				id: "2" as schema.UserId,
				name: "Test Item 2",
			});

			// Query the data
			const result = await db.query.usersTable.findMany();

			setTestResult(JSON.stringify(result, null, 2));
		} catch (err) {
			console.error("Error running test query:", err);
			setTestResult(
				`Error: ${err instanceof Error ? err.message : String(err)}`,
			);
		}
	};

	return (
		<div className="p-4 dark:bg-gray-800 dark:text-white">
			<h1 className="text-xl font-bold mb-4">SQLite Worker Test</h1>

			<div className="mb-4">
				<h2 className="text-lg font-semibold mb-2">Status</h2>
				<div className="p-2 bg-gray-100 dark:bg-gray-700 rounded">
					{isReady ? (
						<span className="text-green-600 dark:text-green-400">
							Worker Ready
						</span>
					) : (
						<span className="text-yellow-600 dark:text-yellow-400">
							Initializing...
						</span>
					)}
				</div>
			</div>

			<div className="mb-4">
				<button
					onClick={runTestQuery}
					disabled={!isReady}
					className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300 dark:disabled:bg-gray-600"
					type="button"
				>
					Run Test Query
				</button>
			</div>

			{testResult && (
				<div className="mb-4">
					<h2 className="text-lg font-semibold mb-2">Query Result</h2>
					<pre className="p-2 bg-gray-100 dark:bg-gray-700 rounded overflow-auto max-h-60">
						{testResult}
					</pre>
				</div>
			)}

			<div>
				<h2 className="text-lg font-semibold mb-2">Worker Logs</h2>
				<pre className="p-2 bg-gray-100 dark:bg-gray-700 rounded overflow-auto max-h-60">
					{logs.join("\n")}
				</pre>
			</div>
		</div>
	);
};

export default () => {
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	return <div>{mounted && <TestInner />}</div>;
};
