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

// Świeże oferty w `promo_offers` nie zmieniają jeszcze cen bazowych — te siedzą
// w `ceny_bazowe_mv` (migracja_ceny_bazowe.sql) i trzeba je przeliczyć.
// Zakładka Koszty czyta gotowy wynik, bo liczenie tego w locie wywalało się
// na `statement timeout`.
//
// Brak widoku nie może wywalić całego pipeline'u — oferty są już zaimportowane
// i to one są tu najważniejsze.
async function odswiezCenyBazowe() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.warn("\nPomijam odświeżenie cen bazowych — brak SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.");
    return;
  }

  console.log("\n> odświeżam ceny bazowe (ceny_bazowe_mv)");

  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(url, key);

  const { error } = await supabase.rpc("odswiez_ceny_bazowe");

  if (error) {
    console.warn(`Nie udało się odświeżyć cen bazowych: ${error.message}`);
    console.warn("Oferty są zaimportowane; zakładka Koszty pokaże dane sprzed przeliczenia.");
    return;
  }

  console.log("Ceny bazowe przeliczone.");
}

const stores = process.env.BLIX_STORES ?? "biedronka,lidl,kaufland,auchan,selgros";

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

  await odswiezCenyBazowe();

  console.log("\nCały pipeline promocji zakończony sukcesem.");
} catch (error) {
  console.error("\nPipeline promocji zakończony błędem:");
  console.error(error.message);
  process.exit(1);
}