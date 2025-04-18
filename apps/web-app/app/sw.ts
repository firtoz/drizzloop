/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

import type { WorkboxPlugin } from "workbox-core";
import { ExpirationPlugin } from "workbox-expiration";
import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";
import { registerRoute, setCatchHandler } from "workbox-routing";
import {
	CacheFirst,
	NetworkFirst,
	StaleWhileRevalidate,
} from "workbox-strategies";

// Clean up old caches
cleanupOutdatedCaches();

// Precache assets from the manifest
precacheAndRoute(self.__WB_MANIFEST);

// Cache the offline page
const FALLBACK_HTML_URL = "/offline.html";
const CACHE_NAME = "offline-fallbacks";

// Cache offline.html on install
self.addEventListener("install", (event) => {
	event.waitUntil(
		caches.open(CACHE_NAME).then((cache) => {
			return cache.add(FALLBACK_HTML_URL);
		}),
	);
});

// Cache page navigations (HTML) with a Network First strategy
registerRoute(
	({ request }) => request.mode === "navigate",
	new NetworkFirst({
		cacheName: "pages-cache",
		plugins: [
			new ExpirationPlugin({
				maxEntries: 50,
			}),
		] as WorkboxPlugin[],
	}),
);

// console.log("SW Env:", import.meta.env.MODE === "development");

// Cache CSS, JS, and Web Worker requests with a Stale While Revalidate strategy
registerRoute(
	({ request }) =>
		request.destination === "style" ||
		request.destination === "script" ||
		request.destination === "worker",
	import.meta.env.MODE === "development"
		? new NetworkFirst({
				cacheName: "assets-cache",
			})
		: new StaleWhileRevalidate({
				cacheName: "assets-cache",
			}),
);

// Cache images with a Cache First strategy
registerRoute(
	({ request }) => request.destination === "image",
	new CacheFirst({
		cacheName: "images-cache",
		plugins: [
			new ExpirationPlugin({
				maxEntries: 60,
				maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
			}),
		] as WorkboxPlugin[],
	}),
);

// Cache API requests with a Network First strategy, falling back to cache
registerRoute(
	({ url }) => url.pathname.startsWith("/api/"),
	new NetworkFirst({
		cacheName: "api-cache",
		plugins: [
			new ExpirationPlugin({
				maxEntries: 100,
				maxAgeSeconds: 60 * 60 * 24, // 1 day
			}),
		] as WorkboxPlugin[],
	}),
);

// Cache static assets with a Cache First strategy
registerRoute(
	({ request }) =>
		request.destination === "font" || request.url.includes("static/"),
	new CacheFirst({
		cacheName: "static-assets-cache",
		plugins: [
			new ExpirationPlugin({
				maxEntries: 60,
				maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
			}),
		] as WorkboxPlugin[],
	}),
);

// Cache SQLite WASM files with a Cache First strategy
registerRoute(
	({ url }) =>
		// url.href.includes("sqlite3") ||
		url.href.includes(".wasm") ||
		url.href.endsWith(".mjs") ||
		url.pathname.includes("deps/") ||
		url.pathname.includes("node_modules/"),
	new CacheFirst({
		cacheName: "sqlite-wasm-cache",
		plugins: [
			new ExpirationPlugin({
				maxEntries: 50,
				maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
			}),
		] as WorkboxPlugin[],
	}),
);

// Set up a catch handler for offline navigation
setCatchHandler(async ({ request }) => {
	try {
		// Return the precached offline page if a document is being requested
		if (request.destination === "document") {
			const fallbackResponse = await caches.match(FALLBACK_HTML_URL);
			if (fallbackResponse) {
				return fallbackResponse;
			}
			return new Response("Offline", {
				status: 200,
				headers: { "Content-Type": "text/html" },
			});
		}

		// For images/assets, return a placeholder or default response
		if (request.destination === "image") {
			return new Response(null, { status: 204 });
		}

		// For other resources, return a basic error response
		return new Response("Offline content not available", {
			status: 503,
			headers: { "Content-Type": "text/plain" },
		});
	} catch (error) {
		console.error("Catch handler error:", error);
		return new Response("Service worker error", {
			status: 500,
			headers: { "Content-Type": "text/plain" },
		});
	}
});

// Add COEP and COOP headers to all first-party responses
// This needs to be registered AFTER all workbox routes to ensure it can intercept responses
self.addEventListener("fetch", (event) => {
	const url = new URL(event.request.url);
	const currentOrigin = self.location.origin;

	// Only apply headers to first-party resources
	if (url.origin === currentOrigin) {
		const fetchPromise = fetch(event.request).then((response) => {
			// Clone the response so we can modify headers
			const newHeaders = new Headers(response.headers);
			newHeaders.set("Cross-Origin-Embedder-Policy", "require-corp");
			newHeaders.set("Cross-Origin-Opener-Policy", "same-origin");

			return new Response(response.body, {
				status: response.status,
				statusText: response.statusText,
				headers: newHeaders,
			});
		});

		event.respondWith(fetchPromise);
	}
});

// Handle messages from clients
self.addEventListener("message", (event) => {
	if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

// Activate event - claim clients and delete old caches
self.addEventListener("activate", (event) => {
	event.waitUntil(self.clients.claim());
});
