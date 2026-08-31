(() => {
  'use strict';

  const root = document.documentElement;
  const config = window.LIBRA_CONFIG || {};
  const getCopy = () => root.lang === 'en' ? {
    invalidForm: 'Check the highlighted fields and consent.',
    sending: 'Sending inquiry…',
    unconfigured: 'The form is not connected to an email address yet. Please contact us directly.',
    subject: 'New inquiry from the LIBRA website',
    consentKey: 'Consent',
    consentValue: 'Accepted',
    sendFailed: 'The inquiry was not sent.',
    success: 'Thank you! Your inquiry has been sent. We will contact you about the work.',
    genericError: 'The inquiry cannot be sent right now. Please try again.'
  } : {
    invalidForm: 'Provjerite označena polja i privolu.',
    sending: 'Šaljemo upit…',
    unconfigured: 'Obrazac još nije povezan s adresom e-pošte. Kontaktirajte nas izravno.',
    subject: 'Novi upit sa stranice LIBRA',
    consentKey: 'Privola',
    consentValue: 'Prihvaćena',
    sendFailed: 'Upit nije poslan.',
    success: 'Hvala! Vaš upit je poslan. Javit ćemo vam se u vezi s radovima.',
    genericError: 'Upit trenutačno nije moguće poslati.'
  };
  let copy = getCopy();
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const intro = document.querySelector('.intro');
  if (intro && reducedMotion) {
    intro.remove();
    root.classList.remove('intro-on');
  } else {
    intro?.addEventListener('animationend', event => {
      if (event.target !== intro || event.animationName !== 'intro-curtain') return;
      intro.remove();
      root.classList.remove('intro-on');
    });
  }
  const header = document.querySelector('[data-header]');
  const updateScrollUi = () => {
    header?.classList.toggle('compact', scrollY > 36);
  };
  updateScrollUi();
  addEventListener('scroll', updateScrollUi, { passive: true });

  const menuButton = document.querySelector('.menu-toggle');
  const mobileMenu = document.querySelector('.mobile-nav');
  const closeMenu = () => {
    mobileMenu?.classList.remove('open');
    menuButton?.setAttribute('aria-expanded', 'false');
    root.classList.remove('menu-open');
  };
  menuButton?.addEventListener('click', () => {
    const open = !mobileMenu.classList.contains('open');
    mobileMenu.classList.toggle('open', open);
    menuButton.setAttribute('aria-expanded', String(open));
    root.classList.toggle('menu-open', open);
  });
  mobileMenu?.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
  addEventListener('keydown', event => {
    if (event.key === 'Escape' && mobileMenu?.classList.contains('open')) {
      closeMenu();
      menuButton?.focus();
    }
  });
  addEventListener('click', event => {
    if (mobileMenu?.classList.contains('open') && !header?.contains(event.target)) closeMenu();
  });
  addEventListener('resize', () => { if (innerWidth > 1050) closeMenu(); }, { passive: true });

  document.querySelectorAll('[data-scroll-top]').forEach(link => {
    link.addEventListener('click', event => {
      event.preventDefault();
      closeMenu();
      history.replaceState(null, '', location.pathname + location.search);
      scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
    });
  });

  const syncTranslatedNode = (current, translated) => {
    if (!current || !translated || current.nodeType !== translated.nodeType) return;
    if (current.nodeType === Node.TEXT_NODE) {
      current.nodeValue = translated.nodeValue;
      return;
    }
    if (current.nodeType !== Node.ELEMENT_NODE) return;
    if (current.matches('[data-year],[data-phone-text],.form-status')) return;

    ['aria-label', 'placeholder', 'lang', 'alt'].forEach(attribute => {
      if (translated.hasAttribute(attribute)) current.setAttribute(attribute, translated.getAttribute(attribute));
      else current.removeAttribute(attribute);
    });
    if (current.matches('a:not([data-phone-link]):not([data-email-link]):not([data-whatsapp-link])')) {
      current.setAttribute('href', translated.getAttribute('href'));
    }
    if (translated.hasAttribute('aria-current')) current.setAttribute('aria-current', translated.getAttribute('aria-current'));
    else current.removeAttribute('aria-current');

    const currentChildren = [...current.childNodes];
    const translatedChildren = [...translated.childNodes];
    if (currentChildren.length !== translatedChildren.length) return;
    currentChildren.forEach((child, index) => syncTranslatedNode(child, translatedChildren[index]));
  };

  const applyLanguageDocument = (translatedDocument, targetUrl) => {
    document.querySelector('.intro')?.remove();
    translatedDocument.querySelector('.intro')?.remove();
    syncTranslatedNode(document.body, translatedDocument.body);
    root.lang = translatedDocument.documentElement.lang;
    root.classList.remove('intro-on', 'language-changing');
    document.title = translatedDocument.title;

    const translatedDescription = translatedDocument.querySelector('meta[name="description"]');
    const currentDescription = document.querySelector('meta[name="description"]');
    if (translatedDescription && currentDescription) currentDescription.content = translatedDescription.content;
    const translatedCanonical = translatedDocument.querySelector('link[rel="canonical"]');
    const currentCanonical = document.querySelector('link[rel="canonical"]');
    if (translatedCanonical && currentCanonical) currentCanonical.href = translatedCanonical.href;
    document.querySelectorAll('meta[property^="og:"]').forEach(meta => {
      const translatedMeta = translatedDocument.querySelector(`meta[property="${meta.getAttribute('property')}"]`);
      if (translatedMeta) meta.content = translatedMeta.content;
    });
    document.querySelectorAll('meta[name^="twitter:"]').forEach(meta => {
      const translatedMeta = translatedDocument.querySelector(`meta[name="${meta.getAttribute('name')}"]`);
      if (translatedMeta) meta.content = translatedMeta.content;
    });
    const translatedStructuredData = translatedDocument.querySelector('script[type="application/ld+json"]');
    const currentStructuredData = document.querySelector('script[type="application/ld+json"]');
    if (translatedStructuredData && currentStructuredData) currentStructuredData.textContent = translatedStructuredData.textContent;

    copy = getCopy();
    history.replaceState(null, '', targetUrl.pathname + targetUrl.search + targetUrl.hash);
  };

  document.querySelectorAll('.language-switch a').forEach(link => {
    link.addEventListener('click', async event => {
      event.preventDefault();
      if (link.hasAttribute('aria-current')) return;
      closeMenu();
      root.classList.add('language-changing');
      const targetUrl = new URL(link.href, location.href);
      try {
        const response = await fetch(targetUrl, { headers: { Accept: 'text/html' } });
        if (!response.ok) throw new Error(`Language request failed: ${response.status}`);
        const translatedDocument = new DOMParser().parseFromString(await response.text(), 'text/html');
        const apply = () => applyLanguageDocument(translatedDocument, targetUrl);
        if (document.startViewTransition && !reducedMotion) document.startViewTransition(apply);
        else apply();
      } catch (error) {
        location.assign(targetUrl.href);
      }
    });
  });

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

  const serviceCards = [...document.querySelectorAll('.service-card')];
  const setActiveService = activeCard => {
    serviceCards.forEach(card => card.classList.toggle('is-active', card === activeCard));
  };
  if (serviceCards.length && matchMedia('(hover: none), (pointer: coarse)').matches) {
    serviceCards.forEach(card => {
      card.addEventListener('pointerup', () => setActiveService(card));
      card.addEventListener('focus', () => setActiveService(card));
    });
    if ('IntersectionObserver' in window) {
      const centeredCards = new Set();
      const serviceObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) centeredCards.add(entry.target);
          else centeredCards.delete(entry.target);
        });
        const viewportCenter = innerHeight / 2;
        const centered = [...centeredCards].sort((a, b) => {
          const aBox = a.getBoundingClientRect();
          const bBox = b.getBoundingClientRect();
          return Math.abs(aBox.top + aBox.height / 2 - viewportCenter)
            - Math.abs(bBox.top + bBox.height / 2 - viewportCenter);
        })[0];
        setActiveService(centered || null);
      }, { rootMargin: '-36% 0px -36% 0px', threshold: 0 });
      serviceCards.forEach(card => serviceObserver.observe(card));
    }
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
    root.classList.add('has-whatsapp');
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

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const status = form.querySelector('.form-status');
    status.className = 'form-status';
    if (!validate()) {
      status.textContent = copy.invalidForm;
      status.classList.add('error');
      form.querySelector(':invalid')?.focus();
      return;
    }
    form.classList.add('busy');
    form.setAttribute('aria-busy', 'true');
    status.textContent = copy.sending;
    try {
      if (!formEndpointConfigured) throw new Error(copy.unconfigured);
      const payload = new FormData(form);
      payload.delete('startedAt');
      payload.set('_subject', copy.subject);
      payload.set('_template', 'table');
      payload.set('_url', location.href);
      payload.set(copy.consentKey, copy.consentValue);
      const response = await fetch(formEndpoint, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: payload
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || copy.sendFailed);
      status.textContent = copy.success;
      status.classList.add('success');
      form.reset();
      form.elements.startedAt.value = Date.now();
    } catch (error) {
      status.textContent = error.message || copy.genericError;
      status.classList.add('error');
    } finally {
      form.classList.remove('busy');
      form.removeAttribute('aria-busy');
    }
  });
})();
