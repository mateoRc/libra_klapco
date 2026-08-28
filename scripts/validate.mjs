import { readFile, access } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = resolve(root, 'public');
const html = await readFile(resolve(publicDir, 'index.html'), 'utf8');
const englishHtml = await readFile(resolve(publicDir, 'en/index.html'), 'utf8');
const privacy = await readFile(resolve(publicDir, 'privatnost.html'), 'utf8');
const englishPrivacy = await readFile(resolve(publicDir, 'en/privacy.html'), 'utf8');
const config = await readFile(resolve(publicDir, 'config.js'), 'utf8');
const headers = await readFile(resolve(publicDir, '_headers'), 'utf8');
const required = [
  '<html lang="hr">', '<h1', 'application/ld+json', 'rel="canonical"',
  'data-phone-link', 'id="inquiry-form"', 'prefers-reduced-motion'
];
for (const marker of required) {
  if (!html.includes(marker)) throw new Error(`Missing required marker: ${marker}`);
}
for (const marker of ['<html lang="en">', 'https://libra.mateolabs.dev/en/', 'Language selection', 'Privacy policy']) {
  if (!englishHtml.includes(marker)) throw new Error(`English page is missing required marker: ${marker}`);
}
for (const page of [html, englishHtml]) {
  for (const marker of ['hreflang="hr"', 'hreflang="en"', 'hreflang="x-default"', 'class="language-switch"']) {
    if (!page.includes(marker)) throw new Error(`Multilingual page is missing required marker: ${marker}`);
  }
}

const pages = [html, englishHtml, privacy, englishPrivacy];
const referenced = pages.flatMap(page => [...page.matchAll(/(?:src|href)="(\/(?:assets|favicon)[^"#?]+)"/g)].map(match => match[1]));
for (const page of [html, englishHtml]) {
  for (const match of page.matchAll(/srcset="([^"]+)"/g)) {
    for (const candidate of match[1].split(',')) referenced.push(candidate.trim().split(/\s+/)[0]);
  }
}
for (const item of new Set(referenced)) await access(resolve(publicDir, item.slice(1)));

for (const forbidden of ['{{SITE_URL}}', '/api/inquiries', 'PHONE_NUMBER_TO_CONFIRM', 'EMAIL_TO_CONFIRM', 'WHATSAPP_TO_CONFIRM', 'lorem ipsum']) {
  const publicText = `${pages.join('\n')}\n${config}`.toLowerCase();
  if (publicText.includes(forbidden.toLowerCase())) throw new Error(`Static files contain forbidden value: ${forbidden}`);
}
if (!html.includes('https://libra.mateolabs.dev/')) throw new Error('Production domain is missing from homepage metadata.');
if (!privacy.includes('https://libra.mateolabs.dev/privatnost')) throw new Error('Croatian privacy canonical URL is missing.');
if (!englishPrivacy.includes('https://libra.mateolabs.dev/en/privacy')) throw new Error('English privacy canonical URL is missing.');
if (!config.includes('https://formsubmit.co/ajax/')) throw new Error('Static email forwarding endpoint is missing.');
if (!headers.includes('https://formsubmit.co')) throw new Error('Cloudflare CSP does not allow the form endpoint.');

console.log(`Validated HR/EN static pages, localized forms, SEO metadata, headers and ${new Set(referenced).size} referenced assets.`);
