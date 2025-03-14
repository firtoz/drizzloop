import { execSync } from "node:child_process";
import path from "node:path";

const exampleDoPath = path.dirname(require.resolve("example-do/package.json"));

const setup = async () => {
	console.log("Global setup");

	execSync("bun run build", {
		cwd: exampleDoPath,
		stdio: "inherit",
	});
};

export default setup;

if (require.main === module) {
	await setup();
}
