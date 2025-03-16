import { useEffect, useState } from "react";

// This component will be shown when a new service worker is available
export function ReloadPrompt() {
	const [offlineReady, setOfflineReady] = useState(false);
	const [needRefresh, setNeedRefresh] = useState(false);
	const [updateSW, setUpdateSW] = useState<(() => Promise<void>) | null>(null);

	useEffect(() => {
		// This event is fired when the service worker has updated and is waiting to be activated
		const onNeedRefresh = (updateFn: () => Promise<void>) => {
			setNeedRefresh(true);
			setUpdateSW(() => updateFn);
		};

		// This event is fired when the service worker is ready to work offline
		const onOfflineReady = () => {
			setOfflineReady(true);
		};

		// Listen for custom events from the service worker
		window.addEventListener("sw:needRefresh", (e) =>
			onNeedRefresh((e as CustomEvent).detail),
		);
		window.addEventListener("sw:offlineReady", () => onOfflineReady());

		return () => {
			window.removeEventListener("sw:needRefresh", (e) =>
				onNeedRefresh((e as CustomEvent).detail),
			);
			window.removeEventListener("sw:offlineReady", () => onOfflineReady());
		};
	}, []);

	const close = () => {
		setOfflineReady(false);
		setNeedRefresh(false);
	};

	return (
		<>
			{(offlineReady || needRefresh) && (
				<div className="fixed bottom-0 right-0 m-4 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 flex flex-col items-center">
					<div className="flex items-center mb-2">
						{offlineReady ? (
							<>
								<span className="text-green-500 mr-2">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										className="h-6 w-6"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
										aria-hidden="true"
									>
										<title>Ready for offline use</title>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M5 13l4 4L19 7"
										/>
									</svg>
								</span>
								<span className="text-sm font-medium">
									App ready to work offline
								</span>
							</>
						) : (
							<>
								<span className="text-blue-500 mr-2">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										className="h-6 w-6"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
										aria-hidden="true"
									>
										<title>Update available</title>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
										/>
									</svg>
								</span>
								<span className="text-sm font-medium">
									New version available
								</span>
							</>
						)}
					</div>

					<div className="flex space-x-2">
						<button
							type="button"
							className="px-3 py-1 text-xs bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
							onClick={close}
						>
							Close
						</button>

						{needRefresh && updateSW && (
							<button
								type="button"
								className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
								onClick={() => updateSW()}
							>
								Reload
							</button>
						)}
					</div>
				</div>
			)}
		</>
	);
}
