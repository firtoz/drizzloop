import { startTransition } from "react";
import { hydrateRoot } from "react-dom/client";
import { HydratedRouter } from "react-router/dom";

// Dynamically import the service worker registration only on the client side
if (typeof window !== "undefined") {
	import("./pwa").catch(console.error);
}

startTransition(() => {
	hydrateRoot(document, <HydratedRouter />);
});
