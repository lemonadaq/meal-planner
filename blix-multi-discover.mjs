import fs from "node:fs/promises";
import path from "node:path";
import { politeFetchText } from "./blix-http.mjs";

const DEFAULT_STORES = ["biedronka", "lidl", "kaufland", "auchan"];
const OUT_DIR = "./promo-output/blix";

function getArg(name, fallback = null) {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return fallback;
  return process.argv[index + 1] ?? fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function decodeHtmlBasic(value) {
  return String(value ?? "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\\\//g, "/")
    .replace(/\\u002F/g, "/")
    .replace(/\\u003A/g, ":")
    .replace(/\\u003C/g, "<")
    .replace(/\\u003E/g, ">");
}

function csvEscape(value) {
  if (value === null || value === undefined) return "";

  const text = String(value);

  if (/[;"\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

async function saveCsv(filePath, rows) {
  if (!rows.length) {
    await fs.writeFile(filePath, "", "utf8");
    return;
  }

  const headers = Object.keys(rows[0]);

  const content = [
    headers.join(";"),
    ...rows.map(row => headers.map(header => csvEscape(row[header])).join(";"))
  ].join("\n");

  await fs.writeFile(filePath, "\ufeff" + content, "utf8");
}

async function fetchText(url) {
  const result = await politeFetchText(url, {
    baseDelayMs: 4000,
    jitterMs: 3000,
    maxRetries: 2,
    cacheDir: "./promo-output/blix/cache/discover",
    label: url
  });

  return result.text;
}

function deduplicate(rows) {
  const seen = new Set();

  return rows.filter(row => {
    const key = `${row.store_slug}|${row.leaflet_id}`;

    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
}

function extractLeafletEndpoints(html, sourceUrl, expectedStoreSlug) {
  const decoded = decodeHtmlBasic(html);
  const results = [];

  const patterns = [
    /https?:\/\/blix\.pl\/sklep\/([^/\s"'<>]+)\/gazetka\/(\d+)\/?/gi,
    /\/sklep\/([^/\s"'<>]+)\/gazetka\/(\d+)\/?/gi,
    /https?:\/\/blix\.pl\/getleaflet\/([^/\s"'<>]+)\/(\d+)\/?/gi,
    /\/getleaflet\/([^/\s"'<>]+)\/(\d+)\/?/gi
  ];

  for (const regex of patterns) {
    let match;

    while ((match = regex.exec(decoded)) !== null) {
      const store_slug = match[1];
      const leaflet_id = match[2];

      if (expectedStoreSlug && store_slug !== expectedStoreSlug) {
        continue;
      }

      results.push({
        store_slug,
        leaflet_id,
        leaflet_url: `https://blix.pl/sklep/${store_slug}/gazetka/${leaflet_id}/`,
        endpoint_url: `https://blix.pl/getleaflet/${store_slug}/${leaflet_id}/`,
        source_page_url: sourceUrl
      });
    }
  }

  return deduplicate(results);
}

async function validateEndpoint(endpointUrl) {
  try {
    const result = await politeFetchText(endpointUrl, {
      baseDelayMs: 4000,
      jitterMs: 3000,
      maxRetries: 2,
      cacheDir: "./promo-output/blix/cache/validate",
      label: endpointUrl
    });

    return {
      endpoint_ok: result.ok,
      endpoint_status: result.status,
      endpoint_content_type: result.contentType,
      endpoint_size: result.text.length,
      endpoint_looks_valid:
        result.ok &&
        result.text.length > 100 &&
        (
          result.text.includes("leaflet") ||
          result.text.includes("gazetka") ||
          result.text.includes("promoc") ||
          result.text.includes("za <strong>")
        )
    };
  } catch (error) {
    return {
      endpoint_ok: false,
      endpoint_status: "",
      endpoint_content_type: "",
      endpoint_size: 0,
      endpoint_looks_valid: false,
      endpoint_error: error.message
    };
  }
}

async function main() {
  const storesArg = getArg("stores", null);
  const shouldValidate = hasFlag("validate");

  const stores = storesArg
    ? storesArg.split(",").map(x => x.trim()).filter(Boolean)
    : DEFAULT_STORES;

  await fs.mkdir(OUT_DIR, { recursive: true });

  const allEndpoints = [];

  for (const store of stores) {
    const storeUrl = `https://blix.pl/sklep/${store}/`;

    console.log(`\nPobieram: ${storeUrl}`);

    try {
      const html = await fetchText(storeUrl);

      await fs.writeFile(
        path.join(OUT_DIR, `${store}_source.html`),
        html,
        "utf8"
      );

      const endpoints = extractLeafletEndpoints(html, storeUrl, store);

      console.log(`Znaleziono gazetek: ${endpoints.length}`);

      allEndpoints.push(...endpoints);

      await sleep(500);
    } catch (error) {
      console.error(`Błąd dla sklepu ${store}: ${error.message}`);
    }
  }

  let output = deduplicate(allEndpoints);

  if (shouldValidate) {
    console.log(`\nSprawdzam endpointy: ${output.length}`);

    const validated = [];

    for (const endpoint of output) {
      console.log(`Validuję: ${endpoint.endpoint_url}`);

      const validation = await validateEndpoint(endpoint.endpoint_url);

      validated.push({
        ...endpoint,
        ...validation
      });

      await sleep(500);
    }

    output = validated;
  }

  output.sort((a, b) => {
    const byStore = a.store_slug.localeCompare(b.store_slug, "pl");
    if (byStore !== 0) return byStore;
    return Number(b.leaflet_id) - Number(a.leaflet_id);
  });

  const jsonPath = path.join(OUT_DIR, "blix_endpoints_all.json");
  const csvPath = path.join(OUT_DIR, "blix_endpoints_all.csv");

  await fs.writeFile(jsonPath, JSON.stringify(output, null, 2), "utf8");
  await saveCsv(csvPath, output);

  console.log("\nGotowe.");
  console.log(`Sklepy: ${stores.join(", ")}`);
  console.log(`Endpointów: ${output.length}`);
  console.log(`JSON: ${jsonPath}`);
  console.log(`CSV: ${csvPath}`);

  console.log("\nPierwsze endpointy:");
  for (const endpoint of output.slice(0, 20)) {
    console.log(`${endpoint.store_slug}: ${endpoint.endpoint_url}`);
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});