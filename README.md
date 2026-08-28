# LIBRA — bager iskopi Labin i Istra

Static Croatian and English presentation website for **LIBRA, obrt za usluge u građevinarstvu**. The production site is designed for Cloudflare Workers static assets and contains no application server, database, or persistent storage.

The website is bilingual: Croatian is the default at `/`, while the complete English version is available at `/en/`. Both versions include language switches, localized forms and privacy pages, canonical URLs and `hreflang` metadata.

## Run locally with Docker

Build and serve the static site through Nginx:

```bash
docker compose up --build
```

Open `http://localhost:8090`. Use `LIBRA_PORT` to choose another host port, for example `LIBRA_PORT=8091 docker compose up --build`.

Stop it with:

```bash
docker compose down
```

Docker is only a local/portable static web server. It does not run an application backend or store form submissions.

For a lightweight preview without Docker, serve the `public` directory with any static file server:

```bash
npx serve public
```

Then open the local URL printed by the command.

## Contact and inquiry form

Public runtime values are configured in [`public/config.js`](public/config.js):

- `phone` — public phone number, preferably in international format
- `email` — public business email address
- `whatsapp` — WhatsApp number in international format
- `formEndpoint` — FormSubmit AJAX endpoint that forwards form submissions by email

Replace the example endpoint with the real recipient address:

```js
formEndpoint: 'https://formsubmit.co/ajax/office@example.com'
```

FormSubmit sends an activation email after the first submission. The recipient must confirm that message before subsequent inquiries are delivered. The static site sends the name, contact, location, work description, consent, and optional image directly to FormSubmit; Cloudflare does not store inquiry data.

## Deploy to Cloudflare Workers

The repository includes `wrangler.jsonc` for the `libra-klapco` Worker and its `public` static assets. Connect the GitHub repository through Workers Builds and use:

- Production branch: `main`
- Build command: leave blank
- Deploy command: `npx wrangler deploy`
- Root directory: `/`

After the first successful deployment, open **Settings → Domains & Routes → Add → Custom Domain** and enter `libra.mateolabs.dev`. Cloudflare creates the DNS record and certificate automatically when `mateolabs.dev` is an active zone in the same account.

Every push to `main` triggers a new production deployment.

## Content and images

- Homepage: `public/index.html`
- English homepage: `public/en/index.html`
- Privacy pages: `public/privatnost.html`, `public/en/privacy.html`
- Layout and visual system: `public/assets/styles.css`
- Interactions and email form: `public/assets/app.js`
- Public contact/form configuration: `public/config.js`
- Cloudflare response headers: `public/_headers`
- SVG logos and favicon: `public/assets/logo-*.svg`, `public/favicon.svg`
- Responsive site images: `public/assets/images/`

Generated images are labeled as illustrative and should eventually be replaced with approved project photographs.

## Check before publishing

```bash
npm run check
```

Also confirm the public phone, email, WhatsApp number, FormSubmit recipient, listed services, and approved project photographs.
