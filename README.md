# LIBRA — bager iskopi Labin i Istra

Static Croatian presentation website for **LIBRA, obrt za usluge u građevinarstvu**. The production site is designed for Cloudflare Pages and contains no application server, database, or persistent storage.

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

## Deploy to Cloudflare Pages

Connect the GitHub repository in **Workers & Pages → Create application → Pages → Connect to Git** and use:

- Framework preset: `None`
- Production branch: `main`
- Build command: leave blank
- Build output directory: `public`
- Root directory: `/`

After the first successful deployment, open **Custom domains → Set up a domain** and enter `libra.mateolabs.dev`. If `mateolabs.dev` is already managed by the same Cloudflare account, Cloudflare creates the DNS record automatically.

Every push to `main` triggers a new production deployment.

## Content and images

- Homepage: `public/index.html`
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
