(() => {
  'use strict';

  const root = document.documentElement;
  const config = window.LIBRA_CONFIG || {};
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (root.classList.contains('intro-on')) {
    try { sessionStorage.setItem('libra-intro', '1'); } catch (_) {}
    setTimeout(() => root.classList.remove('intro-on'), 1500);
  }

  const header = document.querySelector('[data-header]');
  const setHeader = () => header?.classList.toggle('compact', scrollY > 36);
  setHeader();
  addEventListener('scroll', setHeader, { passive: true });

  const menuButton = document.querySelector('.menu-toggle');
  const mobileMenu = document.querySelector('.mobile-nav');
  const closeMenu = () => {
    mobileMenu?.classList.remove('open');
    menuButton?.setAttribute('aria-expanded', 'false');
  };
  menuButton?.addEventListener('click', () => {
    const open = !mobileMenu.classList.contains('open');
    mobileMenu.classList.toggle('open', open);
    menuButton.setAttribute('aria-expanded', String(open));
  });
  mobileMenu?.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
  addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });

  if ('IntersectionObserver' in window && !reducedMotion) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: .12, rootMargin: '0px 0px -35px' });
    document.querySelectorAll('.reveal').forEach(item => observer.observe(item));
  } else {
    document.querySelectorAll('.reveal').forEach(item => item.classList.add('visible'));
  }

  const cleanPhone = value => String(value || '').replace(/[^+\d]/g, '');
  if (config.phone) {
    root.classList.add('has-mobile-call');
    document.querySelectorAll('[data-phone-link]').forEach(link => {
      link.href = `tel:${cleanPhone(config.phone)}`;
      link.classList.remove('is-hidden');
    });
    document.querySelectorAll('[data-phone-text]').forEach(node => { node.textContent = config.phone; });
  }
  if (config.email) {
    document.querySelectorAll('[data-email-link]').forEach(link => {
      link.href = `mailto:${config.email}`;
      link.classList.remove('is-hidden');
    });
    document.querySelectorAll('[data-email-text]').forEach(node => { node.textContent = config.email; });
  }
  if (config.whatsapp) {
    document.querySelectorAll('[data-whatsapp-link]').forEach(link => {
      link.href = `https://wa.me/${cleanPhone(config.whatsapp).replace('+', '')}`;
      link.classList.remove('is-hidden');
    });
  }

  document.querySelectorAll('[data-year]').forEach(node => { node.textContent = new Date().getFullYear(); });

  const form = document.querySelector('#inquiry-form');
  if (!form) return;
  const formEndpoint = String(config.formEndpoint || '').trim();
  const formEndpointConfigured = /^https:\/\/formsubmit\.co\/ajax\/[^/]+$/i.test(formEndpoint)
    && !formEndpoint.includes('your-email@example.com');
  if (formEndpointConfigured) form.action = formEndpoint;
  form.elements.startedAt.value = Date.now();
  const fileInput = form.elements.photo;
  const fileName = form.querySelector('[data-file-name]');
  fileInput?.addEventListener('change', () => {
    fileName.textContent = fileInput.files[0]?.name || 'Odaberite fotografiju';
  });
  form.querySelector('.file-ui')?.addEventListener('click', () => fileInput.click());

  const validate = () => {
    let valid = true;
    form.querySelectorAll('.field').forEach(field => {
      const input = field.querySelector('input[required], textarea[required]');
      if (!input) return;
      const invalid = !input.validity.valid;
      field.classList.toggle('invalid', invalid);
      valid = valid && !invalid;
    });
    const consent = form.elements.consent;
    if (!consent.checked) valid = false;
    return valid;
  };

  const validateFile = file => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) throw new Error('Datoteka je prevelika. Najveća dopuštena veličina je 5 MB.');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Odaberite fotografiju u JPG, PNG ili WebP formatu.');
  };

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const status = form.querySelector('.form-status');
    status.className = 'form-status';
    if (!validate()) {
      status.textContent = 'Provjerite označena polja i privolu.';
      status.classList.add('error');
      form.querySelector(':invalid')?.focus();
      return;
    }
    form.classList.add('busy');
    form.setAttribute('aria-busy', 'true');
    status.textContent = 'Šaljemo upit…';
    try {
      if (!formEndpointConfigured) throw new Error('Obrazac još nije povezan s adresom e-pošte. Kontaktirajte nas izravno.');
      validateFile(fileInput.files[0]);
      const payload = new FormData(form);
      payload.delete('startedAt');
      payload.set('_subject', 'Novi upit sa stranice LIBRA');
      payload.set('_template', 'table');
      payload.set('_url', location.href);
      payload.set('Privola', 'Prihvaćena');
      const response = await fetch(formEndpoint, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: payload
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || 'Upit nije poslan.');
      status.textContent = 'Hvala! Vaš upit je poslan. Javit ćemo vam se u vezi s radovima.';
      status.classList.add('success');
      form.reset();
      fileName.textContent = 'Odaberite fotografiju';
      form.elements.startedAt.value = Date.now();
    } catch (error) {
      status.textContent = error.message || 'Upit trenutačno nije moguće poslati.';
      status.classList.add('error');
    } finally {
      form.classList.remove('busy');
      form.removeAttribute('aria-busy');
    }
  });
})();
