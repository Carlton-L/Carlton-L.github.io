/**
 * Serves dist/ as https://carlton.dev/ in Chromium, so the analytics run as they do on the live
 * site, and nothing reaches the PostHog project. Used by tests/analytics.mjs, and by
 * tests/measure.mjs with HOST=carlton.dev.
 *
 * Chromium's host resolver sends carlton.dev and PostHog's two EU hosts to one local HTTPS server.
 * Its certificate is made for the run with openssl, and Chromium is told to trust that one key.
 * Playwright's request routing would be simpler, but it turns the browser's HTTP cache off, and
 * measure.mjs depends on the cache.
 *
 *   carlton.dev                                 the site handler passed in
 *   eu-assets.i.posthog.com/static/…            PostHog's library, fetched once from the real CDN
 *   eu-assets.i.posthog.com/array/<token>/…     the project's remote config, answered here
 *   eu.i.posthog.com/…                          answered here; every event is decoded into `captured`
 *
 * PostHog drops every event from a browser it takes for a bot, and headless Chromium says it is
 * one: in its user agent, its client hints and navigator.webdriver. `chromeContext()` opens a context
 * that looks like desktop Chrome.
 */
import https from 'node:https';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createHash, X509Certificate } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';

const HOSTS = ['carlton.dev', 'eu.i.posthog.com', 'eu-assets.i.posthog.com'];

// What the project's remote config says, as far as these tests care: recordings are on. The rest
// comes from the options in src/lib/analytics.js.
const REMOTE = { supportedCompression: ['gzip-js', 'base64'], sessionRecording: { endpoint: '/s/' }, heatmaps: false };

function certificate() {
  const dir = mkdtempSync(join(tmpdir(), 'carlton-host-'));
  try {
    execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1', '-subj', '/CN=carlton.dev',
      '-addext', 'subjectAltName=' + HOSTS.map((h) => 'DNS:' + h).join(','),
      '-keyout', join(dir, 'key.pem'), '-out', join(dir, 'cert.pem')], { stdio: 'ignore' });
    const key = readFileSync(join(dir, 'key.pem')), cert = readFileSync(join(dir, 'cert.pem'));
    // the base64 SHA-256 of the public key, which is how Chromium names a key to trust
    const der = new X509Certificate(cert).publicKey.export({ type: 'spki', format: 'der' });
    return { key, cert, spki: createHash('sha256').update(der).digest('base64') };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** The events in one request to eu.i.posthog.com, however PostHog packed them. */
export function decode(body) {
  if (!body.length) return [];
  let text;
  if (body[0] === 0x1f && body[1] === 0x8b) text = gunzipSync(body).toString();
  else {
    text = body.toString();
    if (text.startsWith('data=')) text = Buffer.from(new URLSearchParams(text).get('data'), 'base64').toString();
  }
  const data = JSON.parse(text);
  return Array.isArray(data) ? data : data.batch || [data];
}

const read = (req) => new Promise((resolve) => {
  const parts = [];
  req.on('data', (c) => parts.push(c));
  req.on('end', () => resolve(Buffer.concat(parts)));
});

/** A browser context on `browser` (launched with `args`) that PostHog takes for desktop Chrome. */
export async function chromeContext(browser, options = {}) {
  const version = browser.version();
  const context = await browser.newContext({
    userAgent: `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${version} Safari/537.36`,
    ...options,
  });
  await context.addInitScript((major) => {
    const brands = [{ brand: 'Google Chrome', version: major }, { brand: 'Chromium', version: major }, { brand: 'Not_A Brand', version: '24' }];
    if (navigator.userAgentData) Object.defineProperty(Navigator.prototype, 'userAgentData', { get: () => ({ brands, mobile: false, platform: 'macOS' }) });
  }, version.split('.')[0]);
  return context;
}

/**
 * Starts the server. `site(req, res)` answers for carlton.dev.
 * Returns what Chromium is launched with (`args`), what PostHog was asked (`asked`,
 * 'GET host/path') and the events it was sent (`captured`, each with the `endpoint` it went to).
 */
export async function carltonHost(site) {
  const { key, cert, spki } = certificate();
  const asked = [];
  const captured = [];
  const lib = new Map();

  const server = https.createServer({ key, cert }, async (req, res) => {
    const host = (req.headers.host || '').split(':')[0];
    if (host === 'carlton.dev') return site(req, res);

    const path = req.url.split('?')[0];
    const body = await read(req);
    const cors = {
      'access-control-allow-origin': req.headers.origin || '*',
      'access-control-allow-credentials': 'true',
      'access-control-allow-headers': req.headers['access-control-request-headers'] || '*',
    };
    if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
    asked.push(`${req.method} ${host}${path}`);
    const json = (data) => { res.writeHead(200, { ...cors, 'content-type': 'application/json' }); res.end(JSON.stringify(data)); };

    if (host === 'eu-assets.i.posthog.com') {
      const config = path.match(/^\/array\/([^/]+)\/config(\.js)?$/);
      if (config && config[2]) {
        res.writeHead(200, { ...cors, 'content-type': 'text/javascript' });
        return res.end(`(window._POSTHOG_REMOTE_CONFIG = window._POSTHOG_REMOTE_CONFIG || {})[${JSON.stringify(config[1])}] = { config: ${JSON.stringify(REMOTE)}, siteApps: [] };`);
      }
      if (config) return json(REMOTE);
      if (path.startsWith('/static/')) {
        if (!lib.has(req.url)) {
          const r = await fetch('https://eu-assets.i.posthog.com' + req.url);
          lib.set(req.url, { status: r.status, type: r.headers.get('content-type'), body: Buffer.from(await r.arrayBuffer()) });
        }
        const f = lib.get(req.url);
        res.writeHead(f.status, { ...cors, 'content-type': f.type || 'text/javascript' });
        return res.end(f.body);
      }
      res.writeHead(404, cors);
      return res.end();
    }

    if (path.startsWith('/flags')) return json({ featureFlags: {}, featureFlagPayloads: {}, errorsWhileComputingFlags: false });
    try {
      for (const e of decode(body)) captured.push({ ...e, endpoint: path });
    } catch (e) {
      captured.push({ event: '(could not decode)', endpoint: path, error: e.message });
    }
    json({ status: 1 });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;

  return {
    origin: 'https://carlton.dev',
    args: [
      `--host-resolver-rules=${HOSTS.map((h) => `MAP ${h} 127.0.0.1:${port}`).join(', ')}`,
      `--ignore-certificate-errors-spki-list=${spki}`,
      '--disable-blink-features=AutomationControlled',
    ],
    asked,
    captured,
    close: () => new Promise((r) => server.close(r)),
  };
}
