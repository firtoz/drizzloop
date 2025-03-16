import { useOnlineStatus } from "../utils/network";

export function OfflineIndicator() {
	const isOnline = useOnlineStatus();

	if (isOnline) {
		return null;
	}

	return (
		<div className="fixed bottom-4 right-4 bg-yellow-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center z-50">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				className="h-5 w-5 mr-2"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
			>
				<title>Offline</title>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={2}
					d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
				/>
			</svg>
			<span>You are offline. Some features may be limited.</span>
		</div>
	);
}
