/**
 * Network status utilities for offline-first functionality
 */

import { useEffect, useState } from "react";

/**
 * Check if the browser is currently online
 */
export function isOnline(): boolean {
	return typeof navigator !== "undefined" &&
		typeof navigator.onLine === "boolean"
		? navigator.onLine
		: true;
}

/**
 * React hook to subscribe to online/offline status changes
 */
export function useOnlineStatus(): boolean {
	const [online, setOnline] = useState(isOnline());

	useEffect(() => {
		const abortController = new AbortController();
		const handleOnline = () => setOnline(true);
		const handleOffline = () => setOnline(false);

		window.addEventListener("online", handleOnline, {
			signal: abortController.signal,
		});
		window.addEventListener("offline", handleOffline, {
			signal: abortController.signal,
		});

		return () => {
			abortController.abort();
		};
	}, []);

	return online;
}
