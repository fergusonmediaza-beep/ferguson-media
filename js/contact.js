/* global emailjs, grecaptcha, showToast */

/*
  Page-specific behaviour for /contact/: EmailJS + reCAPTCHA v3 form
  submission and the inquiry-type selector. Shared chrome (loader,
  cookie bar, navbar scroll, offcanvas sidebar, reveal-on-scroll) is
  handled by main.js. The old inline anchor-smooth-scroll handler was
  dropped — <html class="html-root"> already sets scroll-behavior:
  smooth in main.css, so intercepting the click to call
  scrollIntoView() manually was redundant.
*/

const EMAILJS_PUBLIC_KEY = '32FOtBf-pk-tbd2XU';
const EMAILJS_SERVICE_ID = 'service_vgm08e6';
const EMAILJS_TEMPLATE_ID = 'template_axm96wi';
const RECAPTCHA_SITE_KEY = '6LflDpEsAAAAALBXSCZgacLALDANwZKxv6l8ZBPn';

emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });

const contextHints = {
  'CSI & Brand Partnership': 'Tell us about your brand, CSI goals, and the communities you want to serve. We\'ll come back with a Good News Story proposal.',
  'Radio & Distribution': 'Tell us about your organisation and we\'ll put together the right radio and distribution package for your story.',
  'Creative Hub': 'Tell us what you need — social media, video, podcast, website, or brand design. We\'ll scope it personally.',
  'General Enquiry': 'Whatever\'s on your mind — press enquiries, feedback, or simply saying hello.',
};

const iqBtns = document.querySelectorAll('.iq-btn');
const ctxEl = document.getElementById('context_hint');
const iqInput = document.getElementById('inquiry_type');

const selectInquiry = (type) => {
  iqBtns.forEach((b) => b.classList.remove('active'));
  const match = document.querySelector(`.iq-btn[data-type="${type}"]`);

  if (match) {
    match.classList.add('active');
  }

  iqInput.value = type;
  ctxEl.innerHTML = `<em>${type}:</em> ${contextHints[type]}`;
};

iqBtns.forEach((btn) => {
  btn.addEventListener('click', () => selectInquiry(btn.dataset.type));
});

selectInquiry('General Enquiry');

document.querySelectorAll('.field-group input, .field-group textarea').forEach((input) => {
  const update = () => input.closest('.field-group').classList.toggle('has-value', input.value.trim() !== '');
  input.addEventListener('input', update);
  input.addEventListener('change', update);
});

const resetForm = (form) => {
  form.reset();
  document.querySelectorAll('.field-group').forEach((fg) => fg.classList.remove('has-value'));
  iqBtns.forEach((b) => b.classList.remove('active'));
  iqInput.value = '';
  ctxEl.textContent = 'Select an inquiry type above to get started.';
};

document.getElementById('contact_form').addEventListener('submit', (e) => {
  e.preventDefault();

  const type = iqInput.value;
  const firstName = document.getElementById('first_name').value.trim();
  const lastName = document.getElementById('last_name').value.trim();
  const email = document.getElementById('email').value.trim();
  const organisation = document.getElementById('organisation').value.trim();
  const message = document.getElementById('message').value.trim();

  if (!type) {
    showToast('Please select an inquiry type above.', true);
    document.querySelector('.inquiry-grid').scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  if (!firstName) {
    showToast('Please enter your first name.', true);
    document.getElementById('first_name').focus();
    return;
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showToast('Please enter a valid email address.', true);
    document.getElementById('email').focus();
    return;
  }

  if (!message) {
    showToast('Please enter a message before sending.', true);
    document.getElementById('message').focus();
    return;
  }

  const submitBtn = document.getElementById('submit_btn');
  const submitLabel = document.getElementById('submit_label');
  submitBtn.disabled = true;
  submitLabel.textContent = 'Sending…';

  grecaptcha.ready(() => {
    grecaptcha.execute(RECAPTCHA_SITE_KEY, { action: 'contact_form' }).then((token) => emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
      inquiry_type: type,
      first_name: firstName,
      last_name: lastName,
      from_name: `${firstName} ${lastName}`.trim(),
      reply_to: email,
      organisation: organisation || '—',
      message,
      'g-recaptcha-response': token,
    })).then(() => {
      showToast('Message sent! We\'ll be in touch within one business day.');
      resetForm(document.getElementById('contact_form'));
    }).catch((err) => {
      console.error(err);
      showToast('Something went wrong. Please email us directly at info@fergusonmedia.co.za', true);
    }).finally(() => {
      submitBtn.disabled = false;
      submitLabel.textContent = 'Send Message';
    });
  });
});
