import fs from "node:fs";
import path from "node:path";

async function checkPort(port: number): Promise<boolean> {
	try {
		const response = await fetch(`http://localhost:${port}/`, {
			method: "HEAD",
		});
		return response.ok;
	} catch (error) {
		console.error(`Error fetching port ${port}:`, error);
		return false;
	}
}

type DOStatus = {
	name: string;
	port: number;
	isReady: boolean;
};

async function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
	const durableObjectDir = path.join(
		__dirname, // project root/apps/worker-app/scripts
		"..", // project root/apps/worker-app
		"..", // project root/apps
		"..", // project root
		"durable-objects",
	);
	const durableObjectFolders = fs.readdirSync(durableObjectDir);
	const doStatuses = new Map<string, DOStatus>();

	// Initialize status map
	for (const folder of durableObjectFolders) {
		const wranglerPath = path.join(durableObjectDir, folder, "wrangler.json");

		if (!fs.existsSync(wranglerPath)) {
			continue;
		}

		const wranglerContent = JSON.parse(fs.readFileSync(wranglerPath, "utf-8"));
		const devPort = wranglerContent.dev?.port;

		if (!devPort) {
			console.log(`No dev port specified for ${folder}`);
			continue;
		}

		doStatuses.set(folder, {
			name: folder,
			port: devPort,
			isReady: false,
		});
	}

	if (doStatuses.size === 0) {
		console.log("No Durable Objects to check.");
		process.exit(0);
	}

	while (true) {
		let allReady = true;

		for (const [folder, status] of doStatuses) {
			if (status.isReady) continue;

			console.log(`Checking ${folder} on port ${status.port}...`);
			const isReady = await checkPort(status.port);

			if (isReady) {
				console.log(`✓ ${folder} is ready on port ${status.port}`);
				status.isReady = true;
			} else {
				console.log(`✗ ${folder} is not ready on port ${status.port}`);
				allReady = false;
			}
		}

		if (allReady) {
			console.log("\nAll Durable Objects are ready! ✨");
			process.exit(0);
		}

		console.log("\nWaiting 1 second before next check...\n");
		await sleep(1000);
	}
}

main().catch((error) => {
	console.error("Error:", error);
	process.exit(1);
});
