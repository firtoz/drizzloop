import type { Route } from "../+types/root";
import { ASSET_MANIFEST_192, ASSET_MANIFEST_512 } from "../constants/assets";

/**
 * This function generates a web manifest file for the website
 * It includes all necessary PWA configurations and icons
 */
export const loader = (_args: Route.LoaderArgs) => {
	const manifest = {
		name: "DrizzLoop Web App",
		short_name: "DrizzLoop",
		description: "A progressive web app built with Drizzle",
		start_url: "/",
		id: "/",
		display: "standalone",
		orientation: "portrait",
		background_color: "#ffffff",
		theme_color: "#000000",
		icons: [
			{
				src: ASSET_MANIFEST_192,
				sizes: "192x192",
				type: "image/png",
				purpose: "any maskable",
			},
			{
				src: ASSET_MANIFEST_512,
				sizes: "512x512",
				type: "image/png",
				purpose: "any maskable",
			},
		],
		screenshots: [
			{
				src: ASSET_MANIFEST_512,
				sizes: "512x512",
				type: "image/png",
				form_factor: "wide",
				label: "DrizzLoop Web App",
			},
			{
				src: ASSET_MANIFEST_512,
				sizes: "512x512",
				type: "image/png",
				form_factor: "narrow",
				label: "DrizzLoop Web App",
			},
		],
		categories: ["productivity", "utilities"],
		dir: "ltr",
		lang: "en",
		iarc_rating_id: "",
		prefer_related_applications: false,
	};

	return new Response(JSON.stringify(manifest, null, 2), {
		status: 200,
		headers: {
			"Content-Type": "application/manifest+json",
			"Cache-Control": "public, max-age=86400", // Cache for 24 hours
		},
	});
};
