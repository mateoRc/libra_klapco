import { readFile, access } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const html = await readFile(resolve(root, 'public/index.html'), 'utf8');
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
for (const item of new Set(referenced)) await access(resolve(root, 'public', item.slice(1)));

for (const forbidden of ['PHONE_NUMBER_TO_CONFIRM', 'EMAIL_TO_CONFIRM', 'WHATSAPP_TO_CONFIRM', 'lorem ipsum']) {
  if (html.toLowerCase().includes(forbidden.toLowerCase())) throw new Error(`Public HTML exposes forbidden placeholder: ${forbidden}`);
}
console.log(`Validated HTML and ${new Set(referenced).size} referenced assets.`);
