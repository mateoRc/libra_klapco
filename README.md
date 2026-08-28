# LIBRA — bager iskopi Labin i Istra

Production-ready Croatian website for **LIBRA, obrt za usluge u građevinarstvu**. The app uses a dependency-free Node.js server, responsive static frontend, validated inquiry API and Docker Compose.

## Run locally

```bash
docker compose up --build
```

Open [http://localhost](http://localhost). Stop with `docker compose down`. Inquiry data remains in the named `libra_inquiries` volume.

For a direct non-Docker run (Node.js 18+):

```bash
npm start
```

The direct server runs at `http://localhost:3000`.

## Business and contact information

Verified legal data is centralized in [`config/business.js`](config/business.js). Contact values should be provided through environment variables. Copy `.env.example` to `.env` and replace:

- `PHONE_NUMBER_TO_CONFIRM`
- `EMAIL_TO_CONFIRM`
- `WHATSAPP_TO_CONFIRM`
- `YOUR_DOMAIN_TO_CONFIRM`

Unconfirmed phone, email and WhatsApp values are never sent to or displayed in the browser. Their corresponding buttons remain hidden. `PUBLIC_SITE_URL` populates canonical, Open Graph, sitemap and robots URLs at response time.

## Inquiry form

Validated inquiries are saved as newline-delimited JSON in `/data/inquiries.jsonl` inside the persistent Docker volume. Optional images are stored under `/data/uploads`. The endpoint includes a honeypot, minimum-submit-time check, request-size limit, field validation, IP hashing and in-memory rate limiting.

For production notifications, set `CONTACT_WEBHOOK_URL` to an HTTPS endpoint that accepts JSON. Local storage remains the source of truth if webhook delivery fails. Protect and back up the Docker volume, set a retention policy, and remove old inquiries when no longer needed.

## Content and images

- Homepage content: `public/index.html`
- Layout and visual system: `public/assets/styles.css`
- Interactions and form handling: `public/assets/app.js`
- SVG logo set: `public/assets/logo-*.svg` and `public/favicon.svg`
- Generated atmospheric images: `public/assets/images/`

Generated images are clearly labeled as illustrative and are not presented as completed LIBRA projects. Replace them with approved real project photographs using the same filenames, or update the paths and intrinsic dimensions in `public/index.html`.

## Details still requiring confirmation

- Public telephone number
- Public email address
- WhatsApp number and whether WhatsApp should be offered
- Final production domain
- Production inquiry webhook / notification workflow
- Confirmation that every listed potential service is offered; the public copy currently states that final scope is confirmed after site assessment
- Approved real project photographs, if available

## Checks

```bash
npm run check
docker compose config
docker compose up --build -d
curl http://localhost/health
```

The site has keyboard focus states, semantic landmarks and labels, a skip link, reduced-motion handling, a one-session loader, responsive layouts from 320 px, SEO metadata, JSON-LD, `robots.txt`, sitemap, privacy page and a custom 404.
