import fs from "node:fs/promises";
import path from "node:path";

const OUT_DIR = "./kaufland-output/blix";

function getArg(name, fallback = null) {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return fallback;
  return process.argv[index + 1] ?? fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function normalizeUrl(url) {
  if (!url) return null;
  return String(url).trim();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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
  const response = await fetch(url, {
    headers: {
      "accept": "text/html,application/json,*/*",
      "user-agent": "menuPlaner-blix-endpoint-discovery/1.0"
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${url}`);
  }

  return await response.text();
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

function extractStoreSlugFromUrl(url) {
  const match = String(url).match(/\/sklep\/([^/?#]+)\/?/i);
  return match?.[1] ?? null;
}

function extractLeafletLinksFromHtml(html, baseUrl) {
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

      const leaflet_url = `https://blix.pl/sklep/${store_slug}/gazetka/${leaflet_id}/`;
      const endpoint_url = `https://blix.pl/getleaflet/${store_slug}/${leaflet_id}/`;

      results.push({
        store_slug,
        leaflet_id,
        leaflet_url,
        endpoint_url,
        source_page_url: baseUrl
      });
    }
  }

  return deduplicate(results);
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

async function validateEndpoint(endpointUrl) {
  try {
    const response = await fetch(endpointUrl, {
      headers: {
        "accept": "application/json,text/html,*/*",
        "user-agent": "menuPlaner-blix-endpoint-validator/1.0"
      }
    });

    const text = await response.text();

    return {
      ok: response.ok,
      status: response.status,
      content_type: response.headers.get("content-type") ?? "",
      size: text.length,
      looks_valid:
        response.ok &&
        text.length > 100 &&
        (
          text.includes("leaflet") ||
          text.includes("gazetka") ||
          text.includes("products") ||
          text.includes("promoc")
        )
    };
  } catch (error) {
    return {
      ok: false,
      status: null,
      content_type: "",
      size: 0,
      looks_valid: false,
      error: error.message
    };
  }
}

async function main() {
  const url = normalizeUrl(getArg("url", "https://blix.pl/sklep/kaufland/"));
  const shouldValidate = hasFlag("validate");

  await fs.mkdir(OUT_DIR, { recursive: true });

  console.log(`Pobieram stronę: ${url}`);

  const html = await fetchText(url);

  await fs.writeFile(path.join(OUT_DIR, "blix_discovery_source.html"), html, "utf8");

  let endpoints = extractLeafletLinksFromHtml(html, url);

  // Jeśli ktoś podał od razu URL pojedynczej gazetki,
  // a w HTML nie ma linków, wyciągamy ID ze ścieżki.
  if (!endpoints.length) {
    const directMatch = url.match(/\/sklep\/([^/?#]+)\/gazetka\/(\d+)\/?/i);

    if (directMatch) {
      const store_slug = directMatch[1];
      const leaflet_id = directMatch[2];

      endpoints.push({
        store_slug,
        leaflet_id,
        leaflet_url: `https://blix.pl/sklep/${store_slug}/gazetka/${leaflet_id}/`,
        endpoint_url: `https://blix.pl/getleaflet/${store_slug}/${leaflet_id}/`,
        source_page_url: url
      });
    }
  }

  endpoints = deduplicate(endpoints);

  if (shouldValidate) {
    console.log(`Sprawdzam endpointy: ${endpoints.length}`);

    const checked = [];

    for (const endpoint of endpoints) {
      console.log(`Validuję: ${endpoint.endpoint_url}`);

      const validation = await validateEndpoint(endpoint.endpoint_url);

      checked.push({
        ...endpoint,
        endpoint_ok: validation.ok,
        endpoint_status: validation.status,
        endpoint_content_type: validation.content_type,
        endpoint_size: validation.size,
        endpoint_looks_valid: validation.looks_valid,
        endpoint_error: validation.error ?? ""
      });

      await sleep(500);
    }

    endpoints = checked;
  }

  const jsonPath = path.join(OUT_DIR, "blix_endpoints.json");
  const csvPath = path.join(OUT_DIR, "blix_endpoints.csv");

  await fs.writeFile(jsonPath, JSON.stringify(endpoints, null, 2), "utf8");
  await saveCsv(csvPath, endpoints);

  console.log("Gotowe.");
  console.log(`Znaleziono endpointów: ${endpoints.length}`);
  console.log(`JSON: ${jsonPath}`);
  console.log(`CSV: ${csvPath}`);

  for (const endpoint of endpoints.slice(0, 10)) {
    console.log(endpoint.endpoint_url);
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});