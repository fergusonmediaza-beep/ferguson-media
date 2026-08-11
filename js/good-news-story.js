/* global emailjs, grecaptcha */

/*
  Page-specific behaviour for /good-news-story/: the pillar-card
  click-to-expand subcategory overlay, and the enquiry modal (a themed
  Bootstrap Modal — Bootstrap handles focus-trapping, backdrop, and
  Escape/click-outside-to-close). Shared chrome (loader, cookie bar,
  navbar scroll, offcanvas sidebar, reveal-on-scroll) is handled by
  main.js.
*/

document.querySelectorAll('.pillar-card').forEach((card) => {
  card.addEventListener('click', function handleClick(e) {
    if (e.target.closest('a')) {
      return;
    }

    const alreadyExpanded = this.classList.contains('expanded');
    document.querySelectorAll('.pillar-card').forEach((c) => c.classList.remove('expanded'));

    if (!alreadyExpanded) {
      this.classList.add('expanded');
    }
  });
});

document.addEventListener('click', (e) => {
  if (!e.target.closest('.pillar-card')) {
    document.querySelectorAll('.pillar-card').forEach((c) => c.classList.remove('expanded'));
  }
});

const EMAILJS_PUBLIC_KEY = '32FOtBf-pk-tbd2XU';
const EMAILJS_SERVICE_ID = 'service_vgm08e6';
const EMAILJS_TEMPLATE_ID = 'template_axm96wi';
const RECAPTCHA_SITE_KEY = '6LflDpEsAAAAALBXSCZgacLALDANwZKxv6l8ZBPn';

emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });

const enquiryModalEl = document.getElementById('enquiry_modal');
const enquiryForm = document.getElementById('enquiry_form');
const enquirySuccess = document.getElementById('enquiry_success');
const enquiryError = document.getElementById('enquiry_error');
const enquirySubmit = document.getElementById('enquiry_submit');
const enquirySubmitText = document.getElementById('enquiry_submit_text');
const enquiryPackage = document.getElementById('enquiry_package');

enquiryModalEl.addEventListener('show.bs.modal', (event) => {
  const packageValue = event.relatedTarget?.dataset.package || '';

  enquiryForm.style.display = '';
  enquirySuccess.style.display = 'none';
  enquiryError.style.display = 'none';
  enquirySubmit.disabled = false;
  enquirySubmitText.textContent = 'Send Enquiry';

  if (packageValue) {
    for (let i = 0; i < enquiryPackage.options.length; i += 1) {
      if (enquiryPackage.options[i].value === packageValue) {
        enquiryPackage.selectedIndex = i;
        break;
      }
    }
  }
});

enquiryModalEl.addEventListener('shown.bs.modal', () => {
  enquiryForm.querySelector('input')?.focus();
});

enquiryForm.addEventListener('submit', (e) => {
  e.preventDefault();
  enquiryError.style.display = 'none';

  const name = document.getElementById('enquiry_name').value.trim();
  const email = document.getElementById('enquiry_email').value.trim();
  const company = document.getElementById('enquiry_company').value.trim();
  const pkg = enquiryPackage.value;
  const message = document.getElementById('enquiry_message').value.trim();
  const budget = document.getElementById('enquiry_budget').value || 'Not specified';

  if (!name || !email || !company || !pkg || !message) {
    enquiryError.textContent = 'Please fill in all required fields.';
    enquiryError.style.display = 'block';
    return;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    enquiryError.textContent = 'Please enter a valid email address.';
    enquiryError.style.display = 'block';
    return;
  }

  enquirySubmit.disabled = true;
  enquirySubmitText.textContent = 'Sending…';

  const nameParts = name.split(' ');
  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(' ');
  const fullMessage = `Package: ${pkg}\nBudget: ${budget}\n\n${message}`;

  grecaptcha.ready(() => {
    grecaptcha.execute(RECAPTCHA_SITE_KEY, { action: 'good_news_enquiry' }).then((token) => emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
      inquiry_type: pkg,
      first_name: firstName,
      last_name: lastName,
      from_name: name,
      reply_to: email,
      organisation: company,
      message: fullMessage,
      'g-recaptcha-response': token,
    })).then(() => {
      enquiryForm.style.display = 'none';
      enquirySuccess.style.display = 'block';
    }).catch((err) => {
      console.error(err);
      enquirySubmit.disabled = false;
      enquirySubmitText.textContent = 'Send Enquiry';
      enquiryError.innerHTML = 'Something went wrong. Email us at <a href="mailto:info@fergusonmedia.co.za">info@fergusonmedia.co.za</a> or <a href="https://wa.me/27672554475" target="_blank" rel="noopener">WhatsApp us</a>.';
      enquiryError.style.display = 'block';
    });
  });
});
