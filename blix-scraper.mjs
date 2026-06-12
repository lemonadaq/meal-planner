import fs from "node:fs/promises";
import path from "node:path";
import { politeFetchText } from "./blix-http.mjs";

const DEFAULT_INPUT = "./promo-output/blix/blix_endpoints_all.json";
const DEFAULT_OUT_DIR = "./promo-output/blix";
const DEFAULT_DELAY_MS = 700;

function getArg(name, fallback = null) {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return fallback;
  return process.argv[index + 1] ?? fallback;
}
function parseBlixDate(value) {
  if (!value) return null;

  if (typeof value === "object" && value.date) {
    return parseBlixDate(value.date);
  }

  const text = String(value).trim();

  const match = text.match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/
  );

  if (!match) return null;

  const [, year, month, day, hour, minute, second] = match;

  // Blix podaje Europe/Warsaw, ale do porównania wystarczy lokalny Date.
  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second)
  );
}

function toIsoOrNull(date) {
  if (!date || Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function getViewerInfo(parsed) {
  const viewer = parsed?.viewer ?? {};

  const startDate = parseBlixDate(viewer.date_start);
  const endDate = parseBlixDate(viewer.date_end);

  return {
    leaflet_name: viewer.leaflet_name ?? "",
    leaflet_url: viewer.leaflet_url ?? "",
    offer_start_at: toIsoOrNull(startDate),
    offer_end_at: toIsoOrNull(endDate),
    startDate,
    endDate
  };
}

function isLeafletActive(viewerInfo, now = new Date()) {
  if (!viewerInfo.startDate || !viewerInfo.endDate) {
    // Jeśli nie ma dat, nie wywalamy — niech scraper spróbuje.
    return true;
  }

  return viewerInfo.startDate <= now && viewerInfo.endDate >= now;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function normalizeText(value) {
  return String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtmlBasic(value) {
  return normalizeText(value)
    .replace(/\\u003C/g, "<")
    .replace(/\\u003E/g, ">")
    .replace(/\\u0027/g, "'")
    .replace(/\\u002F/g, "/")
    .replace(/\\\//g, "/")
    .replace(/&oacute;/g, "ó")
    .replace(/&Oacute;/g, "Ó")
    .replace(/&aacute;/g, "á")
    .replace(/&eacute;/g, "é")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripHtml(value) {
  return decodeHtmlBasic(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parsePrice(value) {
  if (value === null || value === undefined) return null;

  if (typeof value === "number") {
    if (!Number.isFinite(value) || value <= 0) return null;
    if (Number.isInteger(value)) {
      const wZlotych = value / 100;
      return wZlotych < 10000 ? wZlotych : null;
    }
    return value < 10000 ? value : null;
  }

  let text = String(value)
    .replace(/\s/g, "")
    .replace(/zł/gi, "")
    .replace(/zl/gi, "")
    .replace(/PLN/gi, "")
    .replace(",", ".")
    .trim();

  // np. "1299" jako 12,99 — tylko gdy jawnie wygląda jak cena gazetkowa
  if (/^\d{2,5}$/.test(text)) {
    const grosze = text.slice(-2);
    const zlote = text.slice(0, -2) || "0";
    const parsed = Number(`${Number(zlote)}.${grosze}`);

    if (Number.isFinite(parsed) && parsed > 0 && parsed < 10000) {
      return parsed;
    }
  }

  const match = text.match(/\d+(?:\.\d{1,2})?/);
  if (!match) return null;

  const number = Number(match[0]);

  if (!Number.isFinite(number)) return null;
  if (number <= 0 || number >= 10000) return null;

  return number;
}

function priceText(price) {
  if (price === null || price === undefined) return "";
  return `${Number(price).toFixed(2).replace(".", ",")} zł`;
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

function tryJsonParse(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function collectStringsDeep(value, result = []) {
  if (typeof value === "string") {
    result.push(value);
    return result;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectStringsDeep(item, result);
    }
    return result;
  }

  if (value && typeof value === "object") {
    for (const item of Object.values(value)) {
      collectStringsDeep(item, result);
    }
  }

  return result;
}

function cleanProductName(value) {
  let text = stripHtml(value);

  text = text
    .replace(/^oferty na:\s*/i, "")
    .replace(/^promocja na:\s*/i, "")
    .replace(/^promocje na:\s*/i, "")
    .replace(/^oraz\s+/i, "")
    .replace(/^i\s+/i, "")
    .replace(/^,\s*/, "")
    .replace(/\s+$/, "")
    .trim();

  return text;
}

function isBadProductName(value) {
  const text = normalizeText(value).toLowerCase();

  if (!text) return true;
  if (text.length < 3) return true;
  if (text.length > 180) return true;

  const bad = [
    "gazetka",
    "strona",
    "kliknij",
    "sprawdź",
    "sprawdz",
    "zobacz",
    "promocje",
    "promocja",
    "aktualna",
    "aktualne",
    "blix",
    "kaufland",
    "biedronka",
    "auchan",
    "lidl",
    "newsletter",
    "aplikacja",
    "regulamin",
    "polityka prywatności",
    "wszystkie gazetki"
  ];

  return bad.some(word => text.includes(word));
}

function extractOffersFromStrongHtml(text, context) {
  const html = decodeHtmlBasic(text);
  const offers = [];

  // Najlepszy przypadek:
  // <strong>Produkt</strong> za <strong>12,99zł</strong>
  const regex =
    /<strong>\s*([^<]{3,180}?)\s*<\/strong>\s*(?:już\s*)?za\s*<strong>\s*([0-9]+(?:[,.][0-9]{1,2})?)\s*zł\s*<\/strong>/gi;

  let match;

  while ((match = regex.exec(html)) !== null) {
    const product = cleanProductName(match[1]);
    const price = parsePrice(match[2]);

    if (price === null) continue;
    if (isBadProductName(product)) continue;

    offers.push(makeOffer({
      ...context,
      product_name: product,
      price,
      source: "blix_strong_html",
      raw_match: stripHtml(match[0])
    }));
  }

  return offers;
}

function extractOffersFromText(text, context) {
  const clean = stripHtml(text);
  const offers = [];

  // Fallback tekstowy:
  // "Lody Carte d'Or za 12,99zł"
  // "Kawa Dallmayr za 59,99 zł"
  const regex =
    /([^.;:\n\r]{3,160}?)\s+(?:już\s*)?za\s+([0-9]+(?:[,.][0-9]{1,2})?)\s*zł/gi;

  let match;

  while ((match = regex.exec(clean)) !== null) {
    const product = cleanProductName(match[1]);
    const price = parsePrice(match[2]);

    if (price === null) continue;
    if (isBadProductName(product)) continue;

    offers.push(makeOffer({
      ...context,
      product_name: product,
      price,
      source: "blix_text_fallback",
      raw_match: normalizeText(match[0])
    }));
  }

  return offers;
}

function extractOffersFromStructuredJson(value, context) {
  const offers = [];

  const productKeys = [
    "product",
    "productName",
    "product_name",
    "name",
    "title",
    "label",
    "caption"
  ];

  const priceKeys = [
    "price",
    "priceValue",
    "price_value",
    "currentPrice",
    "current_price",
    "promoPrice",
    "promo_price",
    "discountPrice",
    "discount_price"
  ];

  const oldPriceKeys = [
    "oldPrice",
    "old_price",
    "regularPrice",
    "regular_price",
    "previousPrice",
    "previous_price"
  ];

  function findFirstByKeys(obj, keys) {
    for (const key of keys) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        return obj[key];
      }
    }

    return null;
  }

  function walk(node) {
    if (!node) return;

    if (Array.isArray(node)) {
      for (const item of node) walk(item);
      return;
    }

    if (typeof node !== "object") return;

    const productRaw = findFirstByKeys(node, productKeys);
    const priceRaw = findFirstByKeys(node, priceKeys);
    const oldPriceRaw = findFirstByKeys(node, oldPriceKeys);

    const product = cleanProductName(productRaw);
    const price = parsePrice(priceRaw);
    const oldPrice = parsePrice(oldPriceRaw);

    if (product && price !== null && !isBadProductName(product)) {
      offers.push(makeOffer({
        ...context,
        product_name: product,
        price,
        old_price: oldPrice,
        page_number: Number(node.page || node.pageNumber || node.page_number || context.page_number || 0) || "",
        source: "blix_structured_json",
        raw_match: JSON.stringify(node).slice(0, 500)
      }));
    }

    for (const item of Object.values(node)) {
      walk(item);
    }
  }

  walk(value);

  return offers;
}

function makeOffer({
  store_slug,
  store_name,
  leaflet_id,
  leaflet_name = "",
  leaflet_url,
  endpoint_url,
  product_name,
  price,
  old_price = null,
  page_number = "",
  source,
  raw_match = "",
  offer_start_at = null,
  offer_end_at = null
}) {
  return {
    store_slug,
    store_name,
    leaflet_id,
    leaflet_name,
    leaflet_url,
    endpoint_url,
    product_name,
    price,
    price_text: priceText(price),
    old_price,
    old_price_text: old_price ? priceText(old_price) : "",
    page_number,
    source,
    raw_match,
    offer_start_at,
    offer_end_at
  };
}

function deduplicateOffers(rows) {
  const seen = new Set();

  return rows.filter(row => {
    const key = [
      row.store_slug,
      row.leaflet_id,
      normalizeText(row.product_name).toLowerCase(),
      row.price
    ].join("|");

    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
}

function mapStoreName(slug) {
  const map = {
    biedronka: "Biedronka",
    lidl: "Lidl",
    kaufland: "Kaufland",
    auchan: "Auchan"
  };

  return map[slug] ?? slug;
}

async function fetchEndpoint(endpointUrl) {
  const result = await politeFetchText(endpointUrl, {
    baseDelayMs: 5000,
    jitterMs: 4000,
    maxRetries: 2,
    cacheDir: "./promo-output/blix/cache/endpoints",
    label: endpointUrl
  });

  return {
    ok: result.ok,
    status: result.status,
    contentType: result.contentType,
    raw: result.text,
    fromCache: result.fromCache
  };
}

function buildEndpointContext(endpoint) {
  const store_slug = endpoint.store_slug;
  const leaflet_id = String(endpoint.leaflet_id);

  return {
    store_slug,
    store_name: mapStoreName(store_slug),
    leaflet_id,
    leaflet_url:
      endpoint.leaflet_url ??
      `https://blix.pl/sklep/${store_slug}/gazetka/${leaflet_id}/`,
    endpoint_url:
      endpoint.endpoint_url ??
      `https://blix.pl/getleaflet/${store_slug}/${leaflet_id}/`
  };
}

async function saveRawIfNeeded({ rawDir, context, raw, parsed }) {
  const safeName = `${context.store_slug}_${context.leaflet_id}`;

  await fs.mkdir(rawDir, { recursive: true });

  await fs.writeFile(
    path.join(rawDir, `${safeName}.txt`),
    raw,
    "utf8"
  );

  if (parsed) {
    await fs.writeFile(
      path.join(rawDir, `${safeName}.json`),
      JSON.stringify(parsed, null, 2),
      "utf8"
    );
  }
}

function extractOffersFromEndpoint(raw, parsed, context) {
  const offers = [];

  if (parsed) {
    offers.push(...extractOffersFromStructuredJson(parsed, context));

    const strings = collectStringsDeep(parsed);
    const joined = strings.join("\n");

    offers.push(...extractOffersFromStrongHtml(joined, context));
    offers.push(...extractOffersFromText(joined, context));
  } else {
    offers.push(...extractOffersFromStrongHtml(raw, context));
    offers.push(...extractOffersFromText(raw, context));
  }

  return deduplicateOffers(offers);
}

async function main() {
  const inputPath = getArg("input", DEFAULT_INPUT);
  const outDir = getArg("out", DEFAULT_OUT_DIR);
  const delayMs = Number(getArg("delay", String(DEFAULT_DELAY_MS)));
  const limit = Number(getArg("limit", "0"));
  const storeFilter = getArg("store", null);
  const saveRaw = hasFlag("save-raw");
  const includeExpired = hasFlag("include-expired");

  await fs.mkdir(outDir, { recursive: true });

  const endpointsRaw = await fs.readFile(inputPath, "utf8");
  let endpoints = JSON.parse(endpointsRaw);

  endpoints = endpoints.filter(endpoint => endpoint.endpoint_url);

  if (storeFilter) {
    const allowed = storeFilter
      .split(",")
      .map(x => x.trim())
      .filter(Boolean);

    endpoints = endpoints.filter(endpoint => allowed.includes(endpoint.store_slug));
  }

  if (limit > 0) {
    endpoints = endpoints.slice(0, limit);
  }

  console.log(`Endpointów do pobrania: ${endpoints.length}`);

  const allOffers = [];
  const summary = [];

  for (const endpoint of endpoints) {
    const context = buildEndpointContext(endpoint);

    console.log(`\nPobieram: ${context.store_name} / ${context.leaflet_id}`);
    console.log(context.endpoint_url);

    try {
      const result = await fetchEndpoint(context.endpoint_url);
const parsed = tryJsonParse(result.raw);
const viewerInfo = parsed ? getViewerInfo(parsed) : {};

if (saveRaw) {
  await saveRawIfNeeded({
    rawDir: path.join(outDir, "raw"),
    context,
    raw: result.raw,
    parsed
  });
}

if (!includeExpired && parsed && !isLeafletActive(viewerInfo)) {
  console.log(
    `Pomijam starą gazetkę: ${context.store_name} / ${context.leaflet_id} / ${viewerInfo.leaflet_name} / ${viewerInfo.offer_start_at} - ${viewerInfo.offer_end_at}`
  );

  summary.push({
    store_slug: context.store_slug,
    store_name: context.store_name,
    leaflet_id: context.leaflet_id,
    leaflet_name: viewerInfo.leaflet_name,
    leaflet_url: viewerInfo.leaflet_url || context.leaflet_url,
    endpoint_url: context.endpoint_url,
    offer_start_at: viewerInfo.offer_start_at,
    offer_end_at: viewerInfo.offer_end_at,
    http_ok: result.ok,
    http_status: result.status,
    content_type: result.contentType,
    raw_size: result.raw.length,
    parsed_as_json: Boolean(parsed),
    skipped_reason: "expired_leaflet",
    offers_found: 0
  });

  await sleep(delayMs);
  continue;
}

const contextWithDates = {
  ...context,
  leaflet_name: viewerInfo.leaflet_name,
  leaflet_url: viewerInfo.leaflet_url || context.leaflet_url,
  offer_start_at: viewerInfo.offer_start_at,
  offer_end_at: viewerInfo.offer_end_at
};

const offers = extractOffersFromEndpoint(result.raw, parsed, contextWithDates);

      allOffers.push(...offers);

      summary.push({
        store_slug: context.store_slug,
        store_name: context.store_name,
        leaflet_id: context.leaflet_id,
        leaflet_url: context.leaflet_url,
        endpoint_url: context.endpoint_url,
        http_ok: result.ok,
        http_status: result.status,
        content_type: result.contentType,
        raw_size: result.raw.length,
        parsed_as_json: Boolean(parsed),
        offers_found: offers.length
      });

      console.log(`Znaleziono ofert z ceną: ${offers.length}`);
    } catch (error) {
      console.error(`Błąd: ${error.message}`);

      summary.push({
        store_slug: context.store_slug,
        store_name: context.store_name,
        leaflet_id: context.leaflet_id,
        leaflet_url: context.leaflet_url,
        endpoint_url: context.endpoint_url,
        http_ok: false,
        http_status: "",
        content_type: "",
        raw_size: 0,
        parsed_as_json: false,
        offers_found: 0,
        error: error.message
      });
    }

    await sleep(delayMs);
  }

  const dedupedOffers = deduplicateOffers(allOffers);

  dedupedOffers.sort((a, b) => {
    const byStore = a.store_name.localeCompare(b.store_name, "pl");
    if (byStore !== 0) return byStore;

    const byProduct = a.product_name.localeCompare(b.product_name, "pl");
    if (byProduct !== 0) return byProduct;

    return Number(a.price) - Number(b.price);
  });

  const offersJsonPath = path.join(outDir, "blix_offers_all.json");
  const offersCsvPath = path.join(outDir, "blix_offers_all.csv");

  const summaryJsonPath = path.join(outDir, "blix_scrape_summary.json");
  const summaryCsvPath = path.join(outDir, "blix_scrape_summary.csv");

  await fs.writeFile(
    offersJsonPath,
    JSON.stringify(dedupedOffers, null, 2),
    "utf8"
  );

  await fs.writeFile(
    summaryJsonPath,
    JSON.stringify(summary, null, 2),
    "utf8"
  );

  await saveCsv(offersCsvPath, dedupedOffers);
  await saveCsv(summaryCsvPath, summary);

  console.log("\nGotowe.");
  console.log(`Ofert z ceną: ${dedupedOffers.length}`);
  console.log(`JSON: ${offersJsonPath}`);
  console.log(`CSV: ${offersCsvPath}`);
  console.log(`Summary: ${summaryCsvPath}`);

  const byStore = dedupedOffers.reduce((acc, offer) => {
    acc[offer.store_name] = (acc[offer.store_name] ?? 0) + 1;
    return acc;
  }, {});

  console.log("\nOferty wg sklepu:");
  console.table(byStore);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});