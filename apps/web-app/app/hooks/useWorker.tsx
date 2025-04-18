import type { SqliteRemoteDatabase } from "drizzle-orm/sqlite-proxy";
import {
	type ReactNode,
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import * as schema from "schema/schema";
import type {
	WorkerMessage,
	WorkerResponse,
	WorkerStorageStatus,
} from "~/worker";
import { drizzleWorkerProxy } from "../drizzleWorkerProxy";
import MyWorker from "../worker?worker";

import migrations from "schema/migrations";
import { migrate } from "../utils/sqlite-wasm-migrator";

type LogEntry =
	| { type: "log"; message: string }
	| { type: "error"; message: string };

type WorkerEventListener = (message: WorkerResponse) => void;

type WorkerContextType = {
	worker: Worker | null;
	db: SqliteRemoteDatabase<typeof schema> | null;
	isReady: boolean;
	logs: LogEntry[];
	storageStatus: WorkerStorageStatus | null;
	addEventListener: (
		listener: WorkerEventListener,
		options?: {
			signal?: AbortSignal;
		},
	) => void;
};

// Create context
const WorkerContext = createContext<WorkerContextType>({
	worker: null,
	db: null,
	isReady: false,
	logs: [],
	storageStatus: null,
	addEventListener: (_listener, _options) => {},
});

// Check if we're in a browser environment
const isBrowser = typeof window !== "undefined";

// Provider component
export function WorkerProvider({ children }: { children: ReactNode }) {
	const [isReady, setIsReady] = useState(false);
	const [workerIsReady, setWorkerIsReady] = useState(false);
	const [logs, setLogs] = useState<LogEntry[]>([]);
	const [storageStatus, setStorageStatus] =
		useState<WorkerStorageStatus | null>(null);

	const worker = useMemo(() => {
		// Only create worker in browser environment
		if (isBrowser) {
			return new MyWorker();
		}
		return null;
	}, []);

	const eventHandlers = useMemo(() => {
		return [] as Array<WorkerEventListener>;
	}, []);

	const addEventListener = useCallback(
		(
			listener: WorkerEventListener,
			options: {
				signal?: AbortSignal;
			} = {},
		) => {
			if (options.signal) {
				options.signal.addEventListener("abort", () => {
					const index = eventHandlers.indexOf(listener);
					if (index !== -1) {
						eventHandlers.splice(index, 1);
					}
				});
			}

			eventHandlers.push(listener);
		},
		[eventHandlers],
	);

	useEffect(() => {
		if (!worker) return;

		const abortController = new AbortController();

		const handleMessage = async (e: MessageEvent<WorkerResponse>) => {
			const data = e.data;

			switch (data.type) {
				case "log":
					setLogs((prev) => [...prev, { type: "log", message: data.payload }]);
					break;
				case "error":
					setLogs((prev) => [
						...prev,
						{ type: "error", message: data.payload },
					]);
					break;
				case "ready":
					setWorkerIsReady(true);
					break;
				case "storage-status":
					setStorageStatus(data.status);
					console.log("Storage status:", data);
					break;
				case "check-cross-origin-resources":
					// Handle request to check cross-origin resources
					checkCrossOriginResources();
					break;
				case "request-setup":
					worker.postMessage({
						type: "setup",
						dbName: "test",
					} satisfies WorkerMessage);
					break;
			}
		};

		worker.addEventListener("message", handleMessage, {
			signal: abortController.signal,
		});

		return () => {
			abortController.abort();
		};
	}, [worker]);

	const db = useMemo(() => {
		if (!workerIsReady || !worker) return null;
		return drizzleWorkerProxy(worker, { schema });
	}, [worker, workerIsReady]);

	useEffect(() => {
		if (!db) {
			return;
		}

		const availableDb = db;

		(async () => {
			try {
				setLogs((prev) => [
					...prev,
					{ type: "log", message: "useWorker: Migrating..." },
				]);
				await migrate(availableDb, migrations, true);
				setLogs((prev) => [
					...prev,
					{ type: "log", message: "useWorker: Migration complete" },
				]);
				setIsReady(true);
			} catch (e) {
				setLogs((prev) => [
					...prev,
					{
						type: "error",
						message: `useWorker: Migration failed: ${e instanceof Error ? e.message : String(e)}`,
					},
				]);
			}
		})();
	}, [db]);

	// Function to check for cross-origin resources that might affect isolation
	const checkCrossOriginResources = () => {
		if (typeof document === "undefined") return;

		try {
			// Get all scripts, images, iframes, etc.
			const scripts = Array.from(document.getElementsByTagName("script"));
			const images = Array.from(document.getElementsByTagName("img"));
			const iframes = Array.from(document.getElementsByTagName("iframe"));
			const links = Array.from(document.getElementsByTagName("link"));

			const allResources = [...scripts, ...images, ...iframes, ...links];

			// Check for cross-origin resources
			const crossOriginResources = allResources.filter((el) => {
				let src: string | null = null;
				if ("src" in el && typeof el.src === "string") {
					src = el.src;
				} else if ("href" in el && typeof el.href === "string") {
					src = el.href;
				}

				if (!src) return false;

				try {
					const resourceUrl = new URL(src, window.location.href);
					return resourceUrl.origin !== window.location.origin;
				} catch (e) {
					return false;
				}
			});

			if (crossOriginResources.length > 0) {
				const message = `Found ${crossOriginResources.length} cross-origin resources that might affect isolation`;
				console.warn(message);

				// Send the results back to the worker
				if (worker) {
					// Log a few examples
					const samplesToLog = crossOriginResources.slice(0, 3);
					samplesToLog.forEach((resource, i) => {
						let src = "";
						if ("src" in resource && typeof resource.src === "string") {
							src = resource.src;
						} else if (
							"href" in resource &&
							typeof resource.href === "string"
						) {
							src = resource.href;
						}

						console.log(
							`Cross-origin resource ${i + 1}: ${resource.tagName.toLowerCase()} - ${src}`,
						);
					});
				}
			} else {
				console.log("No cross-origin resources detected");
			}
		} catch (e) {
			console.error("Error checking cross-origin resources:", e);
		}
	};

	const value: WorkerContextType = {
		worker,
		db,
		isReady,
		logs,
		storageStatus,
		addEventListener,
	};

	return (
		<WorkerContext.Provider value={value}>{children}</WorkerContext.Provider>
	);
}

// Hook to use the worker context
export function useWorker({
	eventListener,
}: { eventListener?: WorkerEventListener } = {}) {
	const context = useContext(WorkerContext);
	if (context === undefined) {
		throw new Error("useWorker must be used within a WorkerProvider");
	}

	useEffect(() => {
		if (!eventListener) {
			return;
		}

		const abortController = new AbortController();

		context.addEventListener(eventListener, {
			signal: abortController.signal,
		});

		return () => {
			abortController.abort();
		};
	}, [context.addEventListener, eventListener]);

	return context;
}
