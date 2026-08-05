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

  if (!navbar) {
    return;
  }

  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 56);
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

const showToast = (message) => {
  const toast = document.getElementById('toast');

  if (!toast) {
    return;
  }

  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 4200);
};

window.fmRevealObserver = null;

document.addEventListener('DOMContentLoaded', () => {
  initCookieBar();
  initNavbarScroll();
  window.fmRevealObserver = initRevealOnScroll();
});

initPageLoader();
