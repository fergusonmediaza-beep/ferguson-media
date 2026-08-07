/* global bootstrap */

/*
  Page-specific behaviour for /about/: the team department switcher
  (desktop tab bar + mobile dropdown, kept as bespoke JS rather than
  Bootstrap tabs since the two need to stay in sync with each other),
  the team member modal (a themed Bootstrap Modal populated from the
  clicked card's data-* attributes), and the company-profile download
  gate (a direct Formspree POST, no EmailJS/reCAPTCHA — this form
  never used them). Shared chrome (loader, cookie bar, navbar scroll,
  offcanvas sidebar, reveal-on-scroll) is handled by main.js.
*/

const LINKEDIN_SVG = '<svg viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>';
const X_SVG = '<svg viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z"/></svg>';
const FACEBOOK_SVG = '<svg viewBox="0 0 24 24"><path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.313 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.874v2.25h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/></svg>';

const switchDept = (dept, label) => {
  document.querySelectorAll('.team-panel').forEach((p) => p.classList.remove('active'));
  const panel = document.getElementById(`dept-${dept}`);

  if (panel) {
    panel.classList.add('active');
    panel.querySelectorAll('.rv').forEach((el) => {
      el.classList.remove('on');
      setTimeout(() => window.fmRevealObserver?.observe(el), 50);
    });
  }

  document.querySelectorAll('.team-tab-btn').forEach((b) => b.classList.toggle('active', b.dataset.dept === dept));
  document.querySelectorAll('.team-dropdown-option').forEach((o) => o.classList.toggle('active', o.dataset.dept === dept));

  const selected = document.getElementById('team_dropdown_selected');

  if (selected) {
    selected.textContent = label;
  }
};

document.querySelectorAll('.team-tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => switchDept(btn.dataset.dept, btn.textContent));
});

const teamDropdown = document.getElementById('team_dropdown');

if (teamDropdown) {
  teamDropdown.addEventListener('click', (e) => {
    const option = e.target.closest('.team-dropdown-option');

    if (option) {
      switchDept(option.dataset.dept, option.textContent);
      teamDropdown.classList.remove('open');
    } else {
      teamDropdown.classList.toggle('open');
    }
  });

  document.addEventListener('click', (e) => {
    if (!teamDropdown.contains(e.target)) {
      teamDropdown.classList.remove('open');
    }
  });
}

const teamModalEl = document.getElementById('team_modal');

teamModalEl.addEventListener('show.bs.modal', (event) => {
  const card = event.relatedTarget?.closest('.member-card');

  if (!card) {
    return;
  }

  const d = card.dataset;
  const photo = document.getElementById('team_modal_photo');
  photo.src = d.img || '';
  photo.alt = d.name ? `Portrait of ${d.name}` : '';
  document.getElementById('team_modal_name').textContent = d.name || '';
  document.getElementById('team_modal_dept').textContent = d.dept || '';

  const intern = document.getElementById('team_modal_intern');
  intern.style.display = d.intern ? 'inline-block' : 'none';

  document.getElementById('team_modal_bio').textContent = d.bio || '';

  const links = document.getElementById('team_modal_links');
  let linksHtml = '';

  if (d.linkedin) {
    linksHtml += `<a href="${d.linkedin}" target="_blank" rel="noopener" class="tm-li-link">${LINKEDIN_SVG} LinkedIn</a> `;
  }

  if (d.x) {
    linksHtml += `<a href="${d.x}" target="_blank" rel="noopener" class="tm-li-link">${X_SVG} X</a> `;
  }

  if (d.facebook) {
    linksHtml += `<a href="${d.facebook}" target="_blank" rel="noopener" class="tm-li-link">${FACEBOOK_SVG} Facebook</a>`;
  }

  links.innerHTML = linksHtml;
});

(() => {
  const FORMSPREE_URL = 'https://formspree.io/f/xvzdbydo';
  const PDF_URL = '/ferguson-media-company-profile.pdf';

  const pageField = document.getElementById('fm_gate_page');

  if (pageField) {
    pageField.value = window.location.pathname;
  }

  const emailInput = document.getElementById('fm_gate_email');
  const emailWrap = document.getElementById('fm_gate_email_wrap');

  if (!emailInput) {
    return;
  }

  const updateHasVal = () => emailWrap.classList.toggle('has-val', emailInput.value.trim() !== '');
  emailInput.addEventListener('input', updateHasVal);
  emailInput.addEventListener('change', updateHasVal);

  document.getElementById('fm_gate_form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = emailInput.value.trim();
    const errEl = document.getElementById('fm_gate_err');

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errEl.classList.add('show');
      emailInput.focus();
      return;
    }

    errEl.classList.remove('show');

    const btn = document.getElementById('fm_gate_btn');
    const label = document.getElementById('fm_gate_btn_label');
    btn.disabled = true;
    label.textContent = 'Opening...';

    const link = document.createElement('a');
    link.href = PDF_URL;
    link.target = '_blank';
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      await fetch(FORMSPREE_URL, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          email,
          downloaded_from: window.location.pathname,
          _subject: `New Profile Download — ${email}`,
        }),
      });
      clearTimeout(timeoutId);
    } catch {
      // PDF already opened; the follow-up email is best-effort.
    }

    document.getElementById('fm_form_wrap').style.display = 'none';
    document.getElementById('fm_gate_success').style.display = 'block';
    btn.disabled = false;
    label.textContent = 'Download Now';
  });

  document.getElementById('fm_gate_retry').addEventListener('click', () => {
    document.getElementById('fm_gate_form').reset();
    emailWrap.classList.remove('has-val');
    document.getElementById('fm_form_wrap').style.display = '';
    document.getElementById('fm_gate_success').style.display = 'none';
  });
})();
