import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const OUTPUT_DIR = path.resolve(process.env.HEXO_PUBLIC_DIR || 'public');
const SITEMAP_PATH = path.resolve(process.env.INDEXNOW_SITEMAP || path.join(OUTPUT_DIR, 'sitemap.xml'));
const ENDPOINT = 'https://api.indexnow.org/indexnow';
const MAX_URLS_PER_REQUEST = 10_000;

function decodeXml(value) {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'");
}

async function findKey() {
  if (process.env.INDEXNOW_KEY) {
    const key = process.env.INDEXNOW_KEY.trim();
    if (!/^[a-f0-9]{32}$/i.test(key)) {
      throw new Error('INDEXNOW_KEY must be a 32-character hexadecimal string.');
    }
    return key;
  }

  const entries = await readdir(OUTPUT_DIR, { withFileTypes: true });
  for (const entry of entries) {
    const match = entry.isFile() && entry.name.match(/^([a-f0-9]{32})\.txt$/i);
    if (!match) continue;

    const content = (await readFile(path.join(OUTPUT_DIR, entry.name), 'utf8')).trim();
    if (content.toLowerCase() === match[1].toLowerCase()) return content;
  }

  throw new Error(`No valid IndexNow key file was found in ${OUTPUT_DIR}.`);
}

async function readSitemapUrls() {
  const xml = await readFile(SITEMAP_PATH, 'utf8');
  const urls = [...xml.matchAll(/<loc>([\s\S]*?)<\/loc>/gi)]
    .map((match) => decodeXml(match[1].trim()))
    .filter(Boolean);

  if (urls.length === 0) {
    throw new Error(`No <loc> URLs were found in ${SITEMAP_PATH}.`);
  }

  const siteOrigin = new URL(process.env.SITE_URL || urls[0]).origin;
  const sameSiteUrls = [...new Set(urls)].filter((url) => new URL(url).origin === siteOrigin);
  if (sameSiteUrls.length === 0) {
    throw new Error(`The sitemap contains no URLs for ${siteOrigin}.`);
  }

  return { siteOrigin, urls: sameSiteUrls };
}

async function waitForKeyFile(keyLocation, key) {
  const shouldWait = process.env.INDEXNOW_WAIT_FOR_KEY === 'true';
  if (!shouldWait) return;

  const timeoutMs = Number(process.env.INDEXNOW_WAIT_TIMEOUT_MS || 300_000);
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(keyLocation, { signal: AbortSignal.timeout(10_000) });
      if (response.ok && (await response.text()).trim() === key) {
        console.log(`IndexNow key is publicly available at ${keyLocation}`);
        return;
      }
    } catch {
      // The hosting deployment may still be propagating; retry until timeout.
    }

    console.log('Waiting for the deployed IndexNow key file...');
    await new Promise((resolve) => setTimeout(resolve, 15_000));
  }

  throw new Error(`IndexNow key file was not reachable at ${keyLocation} within ${timeoutMs} ms.`);
}

async function submitBatch(host, key, keyLocation, urlList) {
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host, key, keyLocation, urlList }),
    signal: AbortSignal.timeout(30_000),
  });

  const responseBody = await response.text();
  if (response.status !== 200 && response.status !== 202) {
    throw new Error(`IndexNow returned HTTP ${response.status}${responseBody ? `: ${responseBody}` : ''}`);
  }

  console.log(`IndexNow accepted ${urlList.length} URLs with HTTP ${response.status}.`);
}

const key = await findKey();
const { siteOrigin, urls } = await readSitemapUrls();
const host = new URL(siteOrigin).host;
const keyLocation = new URL(`/${key}.txt`, siteOrigin).href;

await waitForKeyFile(keyLocation, key);

for (let index = 0; index < urls.length; index += MAX_URLS_PER_REQUEST) {
  await submitBatch(host, key, keyLocation, urls.slice(index, index + MAX_URLS_PER_REQUEST));
}
