/**
 * Verified business data. Contact placeholders are intentionally never sent to
 * the browser. Prefer environment variables in production.
 */
module.exports = Object.freeze({
  legalName: 'LIBRA, obrt za usluge u građevinarstvu',
  owner: 'Alessandro Klapčić',
  street: 'Rudarska 10',
  city: 'Labin',
  country: 'HR',
  phone: process.env.PHONE_NUMBER || 'PHONE_NUMBER_TO_CONFIRM',
  email: process.env.EMAIL_ADDRESS || 'EMAIL_TO_CONFIRM',
  whatsapp: process.env.WHATSAPP_NUMBER || 'WHATSAPP_TO_CONFIRM',
  siteUrl: (process.env.PUBLIC_SITE_URL || 'http://localhost').replace(/\/$/, ''),
  webhookUrl: process.env.CONTACT_WEBHOOK_URL || ''
});
