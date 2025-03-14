import process from "node:process";

async function checkWorkers(): Promise<boolean> {
	try {
		const response = await fetch("http://localhost:8787/check-worker", {
			method: "HEAD",
		});

		if (response.ok) {
			return true;
		}
	} catch (error) {
		console.error("Error fetching worker.");
	}
	return false;
}

async function pollWorkers(intervalMs = 1000): Promise<void> {
	while (true) {
		console.log("Checking worker...");
		if (await checkWorkers()) {
			console.log("Worker is ready!");
			process.exit(0);
		}
		console.log(
			`Worker is not ready yet... Trying again in ${intervalMs / 1000} second${
				intervalMs / 1000 === 1 ? "" : "s"
			}.`,
		);
		await new Promise((resolve) => setTimeout(resolve, intervalMs));
	}
}

pollWorkers();
