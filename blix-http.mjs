import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function hashUrl(url) {
  return crypto.createHash("sha1").update(url).digest("hex");
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function politeFetchText(url, options = {}) {
  const {
    baseDelayMs = 3000,
    jitterMs = 2500,
    maxRetries = 3,
    cacheDir = null,
    useCache = true,
    label = ""
  } = options;

  if (cacheDir) {
    await fs.mkdir(cacheDir, { recursive: true });

    const cachePath = path.join(cacheDir, `${hashUrl(url)}.txt`);

    if (useCache && await fileExists(cachePath)) {
      console.log(`CACHE: ${label || url}`);
      return {
        ok: true,
        status: 200,
        contentType: "text/plain; cached",
        text: await fs.readFile(cachePath, "utf8"),
        fromCache: true
      };
    }
  }

  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const delay = baseDelayMs + randomInt(0, jitterMs);

    console.log(`Czekam ${delay} ms przed requestem...`);
    await sleep(delay);

    try {
      console.log(`GET: ${label || url}`);

      const response = await fetch(url, {
        headers: {
          "accept": "application/json,text/html,*/*",
          "user-agent": "menuPlaner-promo-scraper/0.1"
        }
      });

      const text = await response.text();

      const result = {
        ok: response.ok,
        status: response.status,
        contentType: response.headers.get("content-type") ?? "",
        text,
        fromCache: false
      };

      if (response.ok) {
        if (cacheDir) {
          const cachePath = path.join(cacheDir, `${hashUrl(url)}.txt`);
          await fs.writeFile(cachePath, text, "utf8");
        }

        return result;
      }

      if (response.status === 403) {
        throw new Error(`403 Forbidden — Blix blokuje dostęp. Nie retryuję tego endpointu.`);
      }

      if (![429, 500, 502, 503, 504].includes(response.status)) {
        throw new Error(`HTTP ${response.status}: ${url}`);
      }

      const backoff = baseDelayMs * attempt + randomInt(1000, 5000);
      console.log(`HTTP ${response.status}. Próba ${attempt}/${maxRetries}. Backoff ${backoff} ms...`);
      await sleep(backoff);

      lastError = new Error(`HTTP ${response.status}: ${url}`);
    } catch (error) {
      lastError = error;

      if (String(error.message).includes("403 Forbidden")) {
        throw error;
      }

      const backoff = baseDelayMs * attempt + randomInt(1000, 5000);
      console.log(`Błąd: ${error.message}`);
      console.log(`Retry za ${backoff} ms...`);
      await sleep(backoff);
    }
  }

  throw lastError ?? new Error(`Nie udało się pobrać: ${url}`);
}