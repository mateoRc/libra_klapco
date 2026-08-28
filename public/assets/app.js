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

  const fileToDataUrl = file => new Promise((resolve, reject) => {
    if (!file) return resolve(null);
    if (file.size > 5 * 1024 * 1024) return reject(new Error('Datoteka je prevelika. Najveća dopuštena veličina je 5 MB.'));
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return reject(new Error('Odaberite fotografiju u JPG, PNG ili WebP formatu.'));
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name, data: reader.result });
    reader.onerror = () => reject(new Error('Fotografiju nije moguće pročitati.'));
    reader.readAsDataURL(file);
  });

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
    status.textContent = 'Šaljemo upit…';
    try {
      const payload = {
        name: form.elements.name.value,
        contact: form.elements.contact.value,
        location: form.elements.location.value,
        description: form.elements.description.value,
        consent: form.elements.consent.checked,
        website: form.elements.website.value,
        startedAt: form.elements.startedAt.value,
        photo: await fileToDataUrl(fileInput.files[0])
      };
      const response = await fetch('/api/inquiries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Upit nije poslan.');
      status.textContent = result.message;
      status.classList.add('success');
      form.reset();
      fileName.textContent = 'Odaberite fotografiju';
      form.elements.startedAt.value = Date.now();
    } catch (error) {
      status.textContent = error.message || 'Upit trenutačno nije moguće poslati.';
      status.classList.add('error');
    } finally {
      form.classList.remove('busy');
    }
  });
})();
