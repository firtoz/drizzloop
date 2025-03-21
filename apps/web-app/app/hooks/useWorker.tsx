import {
	useState,
	useEffect,
	createContext,
	useContext,
	useMemo,
	type ReactNode,
} from "react";
import MyWorker from "../worker?worker";
import { drizzleWorkerProxy } from "../drizzleWorkerProxy";
import * as schema from "schema/schema";
import type { SqliteRemoteDatabase } from "drizzle-orm/sqlite-proxy";

// Define types for diagnostics information
type Diagnostics = {
	isSecureContext: boolean;
	hasOPFS: boolean;
	hasFileSystem: boolean;
	hasStorage: boolean;
	hasStoragePersist: boolean;
	navigatorStorageEstimate: StorageEstimate | null;
	headers: {
		coep: string | null;
		coop: string | null;
	};
};

// Define types for worker messages and status
type StorageStatus = {
	status: "persistent" | "transient";
	reason?: "indexeddb-error";
	diagnostics?: Diagnostics;
};

type WorkerContextType = {
	worker: Worker | null;
	db: SqliteRemoteDatabase<typeof schema> | null;
	isReady: boolean;
	logs: string[];
	storageStatus: StorageStatus | null;
};

// Create context
const WorkerContext = createContext<WorkerContextType>({
	worker: null,
	db: null,
	isReady: false,
	logs: [],
	storageStatus: null,
});

// Check if we're in a browser environment
const isBrowser = typeof window !== "undefined";

// Provider component
export function WorkerProvider({ children }: { children: ReactNode }) {
	const [isReady, setIsReady] = useState(false);
	const [logs, setLogs] = useState<string[]>([]);
	const [storageStatus, setStorageStatus] = useState<StorageStatus | null>(
		null,
	);

	const worker = useMemo(() => {
		// Only create worker in browser environment
		if (isBrowser) {
			return new MyWorker();
		}
		return null;
	}, []);

	const db = useMemo(() => {
		if (!isReady || !worker) return null;
		return drizzleWorkerProxy(worker, { schema });
	}, [worker, isReady]);

	useEffect(() => {
		if (!worker) return;

		const abortController = new AbortController();

		const handleMessage = (e: MessageEvent) => {
			const data = e.data;

			if (data.type === "log" || data.type === "error") {
				setLogs((prev) => [...prev, data.payload]);
			} else if (data.type === "ready") {
				setIsReady(true);
			} else if (data.type === "storage-status") {
				setStorageStatus(data);
				console.log("Storage status:", data);
			} else if (data.type === "check-cross-origin-resources") {
				// Handle request to check cross-origin resources
				checkCrossOriginResources();
			}
		};

		worker.addEventListener("message", handleMessage, {
			signal: abortController.signal,
		});

		return () => {
			abortController.abort();
		};
	}, [worker]);

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
					worker.postMessage({
						type: "log",
						payload: message,
					});

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

						worker.postMessage({
							type: "log",
							payload: `Cross-origin resource ${i + 1}: ${resource.tagName.toLowerCase()} - ${src}`,
						});
					});
				}
			} else {
				console.log("No cross-origin resources detected");
				if (worker) {
					worker.postMessage({
						type: "log",
						payload:
							"No cross-origin resources detected that could affect isolation",
					});
				}
			}
		} catch (e) {
			console.error("Error checking cross-origin resources:", e);
		}
	};

	const value = {
		worker,
		db,
		isReady,
		logs,
		storageStatus,
	};

	return (
		<WorkerContext.Provider value={value}>{children}</WorkerContext.Provider>
	);
}

// Hook to use the worker context
export function useWorker() {
	const context = useContext(WorkerContext);
	if (context === undefined) {
		throw new Error("useWorker must be used within a WorkerProvider");
	}
	return context;
}
