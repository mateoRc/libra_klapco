'use strict';

const http = require('node:http');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const zlib = require('node:zlib');
const business = require('./config/business');

const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const INQUIRY_FILE = path.join(DATA_DIR, 'inquiries.jsonl');
const RATE_LIMIT_WINDOW = 15 * 60 * 1000;
const RATE_LIMIT_MAX = 5;
const MAX_BODY = 8 * 1024 * 1024;
const rateLimits = new Map();

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8'
};

function securityHeaders(contentType = 'text/plain; charset=utf-8') {
  return {
    'Content-Type': contentType,
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"
  };
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, { ...securityHeaders('application/json; charset=utf-8'), 'Content-Length': Buffer.byteLength(body), 'Cache-Control': 'no-store' });
  res.end(body);
}

function normalizeContact(value, placeholder) {
  if (!value || value === placeholder) return '';
  return String(value).trim();
}

function clean(value, max) {
  return String(value || '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max);
}

function getIp(req) {
  const forwarded = process.env.TRUST_PROXY === 'true' ? (req.headers['x-forwarded-for'] || '').split(',')[0] : '';
  return clean(forwarded || req.socket.remoteAddress || 'unknown', 100);
}

function isRateLimited(ip) {
  const now = Date.now();
  const previous = (rateLimits.get(ip) || []).filter(time => now - time < RATE_LIMIT_WINDOW);
  previous.push(now);
  rateLimits.set(ip, previous);
  return previous.length > RATE_LIMIT_MAX;
}

async function readJson(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw Object.assign(new Error('too-large'), { status: 413 });
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw Object.assign(new Error('invalid-json'), { status: 400 });
  }
}

async function savePhoto(photo, inquiryId) {
  if (!photo) return null;
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(photo.data || '');
  if (!match) throw Object.assign(new Error('invalid-photo'), { status: 400 });
  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length > 5 * 1024 * 1024) throw Object.assign(new Error('photo-too-large'), { status: 413 });
  const extensions = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
  const filename = `${inquiryId}.${extensions[match[1]]}`;
  await fsp.writeFile(path.join(UPLOAD_DIR, filename), buffer, { flag: 'wx', mode: 0o600 });
  return `uploads/${filename}`;
}

async function notifyWebhook(inquiry) {
  if (!business.webhookUrl) return;
  try {
    const response = await fetch(business.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inquiry),
      signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) console.error(`Webhook returned ${response.status}`);
  } catch (error) {
    console.error('Webhook delivery failed:', error.message);
  }
}

async function handleInquiry(req, res) {
  const ip = getIp(req);
  if (isRateLimited(ip)) return sendJson(res, 429, { ok: false, message: 'Previše pokušaja. Pokušajte ponovno za nekoliko minuta.' });
  try {
    const body = await readJson(req);
    if (body.website) return sendJson(res, 200, { ok: true, message: 'Hvala na upitu.' });
    if (!body.startedAt || Date.now() - Number(body.startedAt) < 2500) return sendJson(res, 400, { ok: false, message: 'Molimo provjerite podatke i pokušajte ponovno.' });

    const inquiry = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      name: clean(body.name, 100),
      contact: clean(body.contact, 150),
      location: clean(body.location, 150),
      description: clean(body.description, 3000),
      consent: body.consent === true,
      sourceIpHash: crypto.createHash('sha256').update(ip).digest('hex').slice(0, 16)
    };
    if (inquiry.name.length < 2 || inquiry.contact.length < 5 || inquiry.location.length < 2 || inquiry.description.length < 10 || !inquiry.consent) {
      return sendJson(res, 400, { ok: false, message: 'Ispunite sva obavezna polja i potvrdite privolu.' });
    }
    inquiry.photo = await savePhoto(body.photo, inquiry.id);
    await fsp.appendFile(INQUIRY_FILE, `${JSON.stringify(inquiry)}\n`, { encoding: 'utf8', mode: 0o600 });
    void notifyWebhook(inquiry);
    return sendJson(res, 201, { ok: true, message: 'Hvala! Vaš upit je zaprimljen. Javit ćemo vam se u vezi s radovima.' });
  } catch (error) {
    console.error('Inquiry error:', error.message);
    const status = error.status || 500;
    const message = status === 413 ? 'Datoteka je prevelika. Najveća dopuštena veličina je 5 MB.' : 'Upit trenutačno nije moguće poslati. Pokušajte ponovno.';
    return sendJson(res, status, { ok: false, message });
  }
}

function runtimeConfig() {
  const phone = normalizeContact(business.phone, 'PHONE_NUMBER_TO_CONFIRM');
  const email = normalizeContact(business.email, 'EMAIL_TO_CONFIRM');
  const whatsapp = normalizeContact(business.whatsapp, 'WHATSAPP_TO_CONFIRM');
  return `window.LIBRA_CONFIG=${JSON.stringify({ phone, email, whatsapp })};`;
}

function dynamicText(text) {
  return text.replaceAll('{{SITE_URL}}', business.siteUrl);
}

async function serveFile(req, res, urlPath) {
  let relativePath = decodeURIComponent(urlPath.split('?')[0]);
  if (relativePath === '/') relativePath = '/index.html';
  const requested = path.resolve(PUBLIC_DIR, `.${relativePath}`);
  if (!requested.startsWith(`${PUBLIC_DIR}${path.sep}`)) return sendJson(res, 403, { ok: false });

  let filePath = requested;
  try {
    const stat = await fsp.stat(filePath);
    if (stat.isDirectory()) filePath = path.join(filePath, 'index.html');
  } catch {
    filePath = path.join(PUBLIC_DIR, '404.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';
  const headers = securityHeaders(contentType);
  headers['Cache-Control'] = ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable';
  let body = await fsp.readFile(filePath);
  if (['.html', '.xml', '.txt'].includes(ext)) body = Buffer.from(dynamicText(body.toString('utf8')));
  if (req.headers['accept-encoding']?.includes('gzip') && /^(text|application\/(javascript|json|xml))/.test(contentType)) {
    body = zlib.gzipSync(body);
    headers['Content-Encoding'] = 'gzip';
    headers['Vary'] = 'Accept-Encoding';
  }
  headers['Content-Length'] = body.length;
  res.writeHead(filePath.endsWith('404.html') ? 404 : 200, headers);
  if (req.method === 'HEAD') return res.end();
  res.end(body);
}

async function start() {
  await fsp.mkdir(UPLOAD_DIR, { recursive: true });
  setInterval(() => {
    const cutoff = Date.now() - RATE_LIMIT_WINDOW;
    for (const [ip, attempts] of rateLimits) {
      const recent = attempts.filter(time => time > cutoff);
      if (recent.length) rateLimits.set(ip, recent);
      else rateLimits.delete(ip);
    }
  }, RATE_LIMIT_WINDOW).unref();
  const server = http.createServer(async (req, res) => {
    try {
      const urlPath = new URL(req.url, 'http://localhost').pathname;
      if (urlPath === '/health') return sendJson(res, 200, { ok: true });
      if (urlPath === '/config.js') {
        const body = runtimeConfig();
        res.writeHead(200, { ...securityHeaders('text/javascript; charset=utf-8'), 'Cache-Control': 'no-store', 'Content-Length': Buffer.byteLength(body) });
        return res.end(body);
      }
      if (urlPath === '/api/inquiries' && req.method === 'POST') return handleInquiry(req, res);
      if (!['GET', 'HEAD'].includes(req.method)) return sendJson(res, 405, { ok: false });
      return serveFile(req, res, urlPath);
    } catch (error) {
      console.error(error);
      return sendJson(res, 500, { ok: false, message: 'Interna pogreška poslužitelja.' });
    }
  });
  server.listen(PORT, '0.0.0.0', () => console.log(`LIBRA website listening on port ${PORT}`));
}

start().catch(error => {
  console.error(error);
  process.exit(1);
});
