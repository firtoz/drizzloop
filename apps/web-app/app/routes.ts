import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
	index("routes/home.tsx"),
	route("test", "routes/test.tsx"),
	route("site.webmanifest", "routes/site.webmanifest.ts"),
] satisfies RouteConfig;
