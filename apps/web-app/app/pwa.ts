// /// <reference types="vite-plugin-pwa/client" />

// import { registerSW } from "virtual:pwa-register";

// console.log("registerSW", registerSW);

// // Register service worker using Vite PWA's virtual module
// export const updateSW = registerSW({
// 	onNeedRefresh() {
// 		// Dispatch custom event for the ReloadPrompt component
// 		window.dispatchEvent(
// 			new CustomEvent("sw:needRefresh", { detail: updateSW }),
// 		);
// 	},
// 	onOfflineReady() {
// 		// Dispatch custom event for the ReloadPrompt component
// 		window.dispatchEvent(new CustomEvent("sw:offlineReady"));
// 	},
// });

// // Add online/offline event listeners
// let wasOffline = !navigator.onLine;
// window.addEventListener("online", () => {
// 	// Only reload if we were previously offline
// 	if (wasOffline) {
// 		console.log("App is back online. Reloading to refresh data...");
// 		window.location.reload();
// 	}
// 	wasOffline = false;
// });

// window.addEventListener("offline", () => {
// 	console.log("App is offline. Using cached data...");
// 	wasOffline = true;
// });

export const updateSW = () => {};
