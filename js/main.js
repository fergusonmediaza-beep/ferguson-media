/* global bootstrap */

/*
  Shared behaviour for every Ferguson Media page: page-loader dismissal,
  cookie consent, navbar scroll state, reveal-on-scroll animation, and
  a fetch-with-timeout helper used by every Contentful-backed page.

  The mobile menu and the enquiry/episode modals are NOT handled here —
  they are plain Bootstrap Offcanvas/Modal components wired up entirely
  through data-bs-toggle/data-bs-target attributes in the markup, so
  there is no custom open/close JS left to duplicate or collide with.
*/

const dismissLoader = () => {
  const loader = document.getElementById('page_loader');

  if (loader) {
    loader.classList.add('gone');
  }
};

const fetchWithTimeout = (url, options = {}, timeoutMs = 8000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timeoutId));
};

const initPageLoader = () => {
  window.addEventListener('load', () => setTimeout(dismissLoader, 700));
  setTimeout(dismissLoader, 3000);
};

const initCookieBar = () => {
  const bar = document.getElementById('cookie_bar');
  const acceptBtn = document.getElementById('cookie_accept');
  const declineBtn = document.getElementById('cookie_decline');
  const consentKey = 'fm_cookie_consent';

  if (!bar || !acceptBtn || !declineBtn) {
    return;
  }

  if (!localStorage.getItem(consentKey)) {
    setTimeout(() => bar.classList.add('visible'), 1200);
  }

  acceptBtn.addEventListener('click', () => {
    localStorage.setItem(consentKey, 'accepted');
    bar.classList.remove('visible');
  });

  declineBtn.addEventListener('click', () => {
    localStorage.setItem(consentKey, 'declined');
    bar.classList.remove('visible');
  });
};

const initNavbarScroll = () => {
  const navbar = document.getElementById('navbar');
  const logoImg = document.getElementById('nav_logo_img');

  if (!navbar) {
    return;
  }

  window.addEventListener('scroll', () => {
    const scrolled = window.scrollY > 56;

    navbar.classList.toggle('scrolled', scrolled);

    if (logoImg) {
      logoImg.src = scrolled ? '/images/logo-black.webp' : '/images/logo-white.webp';
    }
  }, { passive: true });
};

const initRevealOnScroll = () => {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('on');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.07, rootMargin: '0px 0px -32px 0px' });

  document.querySelectorAll('.rv, .rv-l, .rv-r, .rv-f').forEach((el) => observer.observe(el));

  return observer;
};

const initOffcanvasAriaExpanded = () => {
  document.querySelectorAll('[data-bs-toggle="offcanvas"]').forEach((trigger) => {
    const targetSelector = trigger.getAttribute('data-bs-target');
    const target = targetSelector ? document.querySelector(targetSelector) : null;

    if (!target) {
      return;
    }

    trigger.setAttribute('aria-expanded', 'false');
    target.addEventListener('shown.bs.offcanvas', () => trigger.setAttribute('aria-expanded', 'true'));
    target.addEventListener('hidden.bs.offcanvas', () => trigger.setAttribute('aria-expanded', 'false'));
  });
};

const showToast = (message, isError = false) => {
  const toast = document.getElementById('toast');

  if (!toast) {
    return;
  }

  toast.textContent = message;
  toast.classList.toggle('error', isError);
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 4200);
};

const initNewsletterForm = () => {
  const form = document.getElementById('mc-embedded-subscribe-form');

  if (!form) {
    return;
  }

  const emailInput = form.querySelector('#mce-EMAIL');
  const errorDiv   = form.querySelector('#mce-error-response');
  const successDiv = form.querySelector('#mce-success-response');
  const btn        = form.querySelector('#mc-embedded-subscribe');

  // JS owns visibility — hide both on init
  errorDiv.style.display   = 'none';
  successDiv.style.display = 'none';

  const showError = (msg) => {
    successDiv.style.display = 'none';
    errorDiv.textContent     = msg;
    errorDiv.style.display   = 'block';
  };

  const reset = () => {
    btn.disabled    = false;
    btn.textContent = 'Subscribe';
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const email = (emailInput.value || '').trim();

    if (!email) {
      showError('Please enter your email address.');
      emailInput.focus();
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      showError('Please enter a valid email address — e.g. name@example.com');
      emailInput.focus();
      return;
    }

    btn.disabled    = true;
    btn.textContent = 'Sending…';
    errorDiv.style.display   = 'none';
    successDiv.style.display = 'none';

    const endpoint = form.action.replace('/post?', '/post-json?');
    const params   = new URLSearchParams(new FormData(form));
    const cb       = '_fmnl_' + Date.now();
    let settled    = false;

    const settle = () => {
      settled = true;
      delete window[cb];
    };

    window[cb] = (res) => {
      if (settled) { return; }
      settle();
      reset();

      if (res.result === 'success') {
        window.location.reload();
        return;
      }

      const msg = (res.msg || 'Something went wrong — please try again.')
        .replace(/<[^>]+>/g, '')
        .replace(/^\d+ - /, '');
      showError(msg);
    };

    params.set('c', cb);

    const script = document.createElement('script');

    script.onerror = () => {
      if (settled) { return; }
      settle();
      reset();
      showError('Unable to connect — please check your internet and try again.');
    };

    // 10-second timeout fallback
    setTimeout(() => {
      if (settled) { return; }
      settle();
      reset();
      showError('Request timed out — please try again.');
    }, 10000);

    script.src = endpoint + '&' + params.toString();
    document.head.appendChild(script);
  });
};

window.fmRevealObserver = null;

document.addEventListener('DOMContentLoaded', () => {
  initCookieBar();
  initNavbarScroll();
  initOffcanvasAriaExpanded();
  initNewsletterForm();
  window.fmRevealObserver = initRevealOnScroll();
});

initPageLoader();
