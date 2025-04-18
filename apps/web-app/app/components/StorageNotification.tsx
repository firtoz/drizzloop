import { useCallback, useState } from "react";
import { useWorker } from "../hooks/useWorker";

// Check if we're in a browser environment
const isBrowser = typeof window !== "undefined";

export function StorageNotification() {
	// TODO use an actual toast for this

	// Only use the worker hook in browser environments
	const { storageStatus } = isBrowser ? useWorker() : { storageStatus: null };
	const [isDismissed, setIsDismissed] = useState(false);
	const [showDetails, setShowDetails] = useState(false);

	const getMessage = useCallback(() => {
		if (!storageStatus) {
			return null;
		}

		if (storageStatus.status === "transient") {
			if (storageStatus.reason === "indexeddb-error") {
				return "Failed to create persistent storage using IndexedDB. Your data will not be saved when you close the app.";
			}
			return "Your data is being stored temporarily and will be lost when you close the app.";
		}
		return "";
	}, [storageStatus]);

	if (
		!isBrowser ||
		isDismissed ||
		!storageStatus ||
		storageStatus.status === "persistent"
	) {
		return null;
	}

	return (
		<div className="fixed bottom-4 right-4 max-w-md bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded shadow-lg z-50">
			<div className="flex flex-col">
				<div className="ml-3">
					<p className="text-sm font-medium">Storage Warning</p>
					<p className="text-xs mt-1">{getMessage()}</p>

					<div className="mt-2 flex items-center space-x-2">
						<button
							type="button"
							onClick={() => setIsDismissed(true)}
							className="text-xs text-yellow-700 hover:underline focus:outline-none"
						>
							Dismiss
						</button>
						<button
							type="button"
							onClick={() => setShowDetails(!showDetails)}
							className="text-xs text-yellow-700 hover:underline focus:outline-none"
						>
							{showDetails ? "Hide Details" : "Show Details"}
						</button>
					</div>

					{showDetails && storageStatus.diagnostics && (
						<div className="mt-3 p-2 bg-yellow-50 rounded text-xs max-h-48 overflow-auto">
							<h4 className="font-semibold">Diagnostics:</h4>
							<pre className="text-xs whitespace-pre-wrap overflow-x-auto">
								{JSON.stringify(storageStatus.diagnostics, null, 2)}
							</pre>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
