import { readFile, access } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = resolve(root, 'public');
const html = await readFile(resolve(publicDir, 'index.html'), 'utf8');
const privacy = await readFile(resolve(publicDir, 'privatnost.html'), 'utf8');
const config = await readFile(resolve(publicDir, 'config.js'), 'utf8');
const headers = await readFile(resolve(publicDir, '_headers'), 'utf8');
const required = [
  '<html lang="hr">', '<h1', 'application/ld+json', 'rel="canonical"',
  'data-phone-link', 'id="inquiry-form"', 'prefers-reduced-motion'
];
for (const marker of required) {
  if (!html.includes(marker)) throw new Error(`Missing required marker: ${marker}`);
}
const referenced = [...html.matchAll(/(?:src|href)="(\/(?:assets|favicon)[^"#?]+)"/g)].map(match => match[1]);
for (const match of html.matchAll(/srcset="([^"]+)"/g)) {
  for (const candidate of match[1].split(',')) referenced.push(candidate.trim().split(/\s+/)[0]);
}
for (const item of new Set(referenced)) await access(resolve(publicDir, item.slice(1)));

for (const forbidden of ['{{SITE_URL}}', '/api/inquiries', 'PHONE_NUMBER_TO_CONFIRM', 'EMAIL_TO_CONFIRM', 'WHATSAPP_TO_CONFIRM', 'lorem ipsum']) {
  const publicText = `${html}\n${privacy}\n${config}`.toLowerCase();
  if (publicText.includes(forbidden.toLowerCase())) throw new Error(`Static files contain forbidden value: ${forbidden}`);
}
if (!html.includes('https://libra.mateolabs.dev/')) throw new Error('Production domain is missing from homepage metadata.');
if (!config.includes('https://formsubmit.co/ajax/')) throw new Error('Static email forwarding endpoint is missing.');
if (!headers.includes('https://formsubmit.co')) throw new Error('Cloudflare CSP does not allow the form endpoint.');

console.log(`Validated static HTML, email form configuration, headers and ${new Set(referenced).size} referenced assets.`);
