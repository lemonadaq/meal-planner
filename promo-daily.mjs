import { spawn } from "node:child_process";

function run(command, args) {
  return new Promise((resolve, reject) => {
    console.log(`\n> ${command} ${args.join(" ")}`);

    const child = spawn(command, args, {
      stdio: "inherit",
      shell: true
    });

    child.on("close", code => {
      if (code === 0) resolve();
      else reject(new Error(`Komenda zakończona kodem ${code}: ${command} ${args.join(" ")}`));
    });
  });
}

const stores = process.env.BLIX_STORES ?? "biedronka,lidl,kaufland,auchan";

try {
  await run("node", [
    "blix-multi-discover.mjs",
    "--stores",
    stores
  ]);

  await run("node", [
    "blix-scraper.mjs",
    "--save-raw",
    "--delay",
    "5000"
  ]);

  await run("node", [
    "blix-import-supabase.mjs"
  ]);

  console.log("\nCały pipeline promocji zakończony sukcesem.");
} catch (error) {
  console.error("\nPipeline promocji zakończony błędem:");
  console.error(error.message);
  process.exit(1);
}