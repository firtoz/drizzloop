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
			}
		};

		worker.addEventListener("message", handleMessage, {
			signal: abortController.signal,
		});

		return () => {
			abortController.abort();
		};
	}, [worker]);

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
