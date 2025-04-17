// import sqlite3InitModule, { type Sqlite3Static } from "@sqlite.org/sqlite-wasm";
import { useEffect, useState } from "react";
import * as schema from "schema/schema";
import { StorageNotification } from "../components/StorageNotification";
import { WorkerProvider, useWorker } from "../hooks/useWorker";

// ClientOnly component for hydration-safe Worker usage
function ClientOnly({ children }: { children: React.ReactNode }) {
	const [isMounted, setIsMounted] = useState(false);

	useEffect(() => {
		setIsMounted(true);
	}, []);

	return isMounted ? <>{children}</> : null;
}

const TestInner = () => {
	const [testResult, setTestResult] = useState<string>("");
	const { db, isReady, logs, storageStatus, worker } = useWorker();
	const [showDiagnostics, setShowDiagnostics] = useState(false);

	// Check if we're in a browser environment where the worker is available
	const workerAvailable = !!worker;

	const addItem = async () => {
		if (!db) return;

		try {
			// Insert a new item with timestamp to make it unique
			await db.insert(schema.usersTable).values({
				id: `${Date.now()}` as schema.UserId,
				name: `Test Item: ${new Date().toLocaleTimeString()}`,
			});

			setTestResult("Item added successfully");

			// Automatically query to show updated data
			await queryItems();
		} catch (err) {
			console.error("Error adding item:", err);
			setTestResult(
				`Error: ${err instanceof Error ? err.message : String(err)}`,
			);
		}
	};

	const clearItems = async () => {
		if (!db) return;

		try {
			await db.delete(schema.usersTable);
			setTestResult("All items cleared");

			// Automatically query to show updated data
			await queryItems();
		} catch (err) {
			console.error("Error clearing items:", err);
			setTestResult(
				`Error: ${err instanceof Error ? err.message : String(err)}`,
			);
		}
	};

	const queryItems = async () => {
		if (!db) return;

		try {
			// Query the data
			const result = await db.query.usersTable.findMany();
			setTestResult(JSON.stringify(result, null, 2));
		} catch (err) {
			console.error("Error querying items:", err);
			setTestResult(
				`Error: ${err instanceof Error ? err.message : String(err)}`,
			);
		}
	};

	return (
		<div className="p-4 dark:bg-gray-800 dark:text-white">
			<h1 className="text-xl font-bold mb-4">SQLite Worker Test</h1>

			{!workerAvailable ? (
				<div className="p-4 bg-yellow-100 text-yellow-800 rounded">
					Worker is not available in this environment. This feature requires a
					browser environment.
				</div>
			) : (
				<>
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

						{storageStatus && (
							<div className="mt-2 p-2 bg-yellow-100 dark:bg-yellow-800 dark:text-yellow-200 text-yellow-800 rounded">
								<div className="flex justify-between items-center">
									<div>
										<strong>Storage Status:</strong>{" "}
										{storageStatus.status === "persistent"
											? "Persistent (data will be saved)"
											: "Temporary (data will be lost when you close the browser)"}
										{storageStatus.reason && (
											<div>
												<strong>Reason:</strong> {storageStatus.reason}
											</div>
										)}
									</div>
									{storageStatus.diagnostics && (
										<button
											onClick={() => setShowDiagnostics(!showDiagnostics)}
											className="text-xs underline"
											type="button"
										>
											{showDiagnostics
												? "Hide Diagnostics"
												: "Show Diagnostics"}
										</button>
									)}
								</div>

								{showDiagnostics && storageStatus.diagnostics && (
									<div className="mt-2 p-2 bg-white/20 rounded">
										<pre className="text-xs whitespace-pre-wrap overflow-x-auto">
											{JSON.stringify(storageStatus.diagnostics, null, 2)}
										</pre>
									</div>
								)}
							</div>
						)}
					</div>

					<div className="mb-4 flex gap-2">
						<button
							onClick={addItem}
							disabled={!isReady}
							className="px-4 py-2 bg-green-500 text-white rounded disabled:bg-gray-300 dark:disabled:bg-gray-600"
							type="button"
						>
							Add Item
						</button>

						<button
							onClick={clearItems}
							disabled={!isReady}
							className="px-4 py-2 bg-red-500 text-white rounded disabled:bg-gray-300 dark:disabled:bg-gray-600"
							type="button"
						>
							Clear All
						</button>

						<button
							onClick={queryItems}
							disabled={!isReady}
							className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300 dark:disabled:bg-gray-600"
							type="button"
						>
							Query Items
						</button>
					</div>

					{testResult && (
						<div className="mb-4">
							<h2 className="text-lg font-semibold mb-2">Result</h2>
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
				</>
			)}
		</div>
	);
};

// The main page component with proper WorkerProvider handling
export default function TestPage() {
	return (
		<div>
			<ClientOnly>
				<WorkerProvider>
					<TestInner />
					<StorageNotification />
				</WorkerProvider>
			</ClientOnly>
			<noscript>
				<div className="p-4 bg-yellow-100 text-yellow-800 rounded">
					JavaScript is required for this feature to work.
				</div>
			</noscript>
		</div>
	);
}
