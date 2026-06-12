import fs from "node:fs/promises";
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const DEFAULT_INPUT = "./promo-output/blix/blix_offers_all.json";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Brakuje SUPABASE_URL albo SUPABASE_SERVICE_ROLE_KEY w .env");
}

const supabase = createClient(supabaseUrl, supabaseKey);

function getArg(name, fallback = null) {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return fallback;
  return process.argv[index + 1] ?? fallback;
}

function normalizeText(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function hashOffer(offer) {
  const key = [
    offer.store_slug,
    offer.leaflet_id,
    normalizeText(offer.product_name),
    offer.price ?? "",
    offer.old_price ?? ""
  ].join("|");

  return crypto.createHash("sha1").update(key).digest("hex");
}

function toNumberOrNull(value) {
  if (value === "" || value === null || value === undefined) return null;

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

function toIntOrNull(value) {
  if (value === "" || value === null || value === undefined) return null;

  const number = Number(value);

  return Number.isInteger(number) ? number : null;
}

function chunkArray(array, size) {
  const chunks = [];

  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }

  return chunks;
}

async function createRun(stores) {
  const { data, error } = await supabase
    .from("promo_scrape_runs")
    .insert({
      status: "running",
      stores
    })
    .select("id")
    .single();

  if (error) throw error;

  return data.id;
}

async function finishRun(runId, status, offersCount, errorMessage = null) {
  const { error } = await supabase
    .from("promo_scrape_runs")
    .update({
      status,
      finished_at: new Date().toISOString(),
      offers_count: offersCount,
      error_message: errorMessage
    })
    .eq("id", runId);

  if (error) {
    console.error("Nie udało się zaktualizować promo_scrape_runs:", error.message);
  }
}

async function main() {
  const inputPath = getArg("input", DEFAULT_INPUT);

  const raw = await fs.readFile(inputPath, "utf8");
  const offers = JSON.parse(raw);

  const stores = [...new Set(offers.map(offer => offer.store_slug).filter(Boolean))];

  const runId = await createRun(stores);

  try {
    const scrapedAt = new Date().toISOString();

const rows = offers
  .filter(offer => offer.product_name)
  .filter(offer => offer.price !== null && offer.price !== undefined)
  .map(offer => ({
    store_slug: offer.store_slug,
    store_name: offer.store_name,

    leaflet_id: String(offer.leaflet_id ?? ""),
    leaflet_name: offer.leaflet_name ?? null,
    leaflet_url: offer.leaflet_url ?? null,
    endpoint_url: offer.endpoint_url ?? null,

    product_name: offer.product_name,
    price: toNumberOrNull(offer.price),
    price_text: offer.price_text ?? null,

    old_price: toNumberOrNull(offer.old_price),
    old_price_text: offer.old_price_text ?? null,

    page_number: toIntOrNull(offer.page_number),
    source: offer.source ?? "blix",
    raw_match: offer.raw_match ?? null,

    offer_start_at: offer.offer_start_at ?? null,
    offer_end_at: offer.offer_end_at ?? null,

    source_hash: hashOffer(offer),

    scraped_at: scrapedAt,
    updated_at: scrapedAt
  }));

    const batches = chunkArray(rows, 500);

    let imported = 0;

    for (const batch of batches) {
      const { error } = await supabase
        .from("promo_offers")
        .upsert(batch, {
          onConflict: "source_hash"
        });

      if (error) throw error;

      imported += batch.length;
      console.log(`Zaimportowano: ${imported}/${rows.length}`);
    }

    await finishRun(runId, "success", imported);

    console.log("Gotowe.");
    console.log(`Zaimportowano / zaktualizowano ofert: ${imported}`);
  } catch (error) {
    await finishRun(runId, "error", 0, error.message);
    throw error;
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});