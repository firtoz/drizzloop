// import sqlite3InitModule, { type Sqlite3Static } from "@sqlite.org/sqlite-wasm";
import { useEffect, useState } from "react";
import { useMemo } from "react";
import MyWorker from "../worker?worker";

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
	const worker = useMemo(() => new MyWorker(), []);

	useEffect(() => {
		worker.onmessage = (e) => {
			console.log(e);
		};
	}, [worker]);

	return <div>Test</div>;
};

export default () => {
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	return <div>{mounted && <TestInner />}</div>;
};
