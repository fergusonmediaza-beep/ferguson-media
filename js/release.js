/* global fetchWithTimeout, dismissLoader */

/*
  Single media release (/newsroom/release/?slug=...). Same approach as
  article.js: the <h1> and every other element already exist in the
  static HTML, and this script only fills text/attributes and toggles
  `d-none`. Every release carries a disclosure line naming the issuing
  organisation, since the text is theirs. Wording stays neutral about how
  the release reached us (sent in or found online), so it is true either way.
*/

const SPACE_ID = 'xjj6th2dvsr4';
const ACCESS_TOKEN = 'NBNt7hRNApZl2NHeUXELHWA_P34CKKv2zzU7UAS_IMk';
const ENV = 'master';
const CONTENT_TYPE = 'pressRelease';

const fmtDate = (iso) => new Date(iso).toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' });

const escapeHtml = (str) => String(str)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const getAssetUrl = (includes, id, width = 1200, height = null, fit = 'fill') => {
  const asset = includes?.Asset?.find((a) => a.sys.id === id);

  if (!asset) {
    return null;
  }

  let url = `https:${asset.fields.file.url}?w=${width}&fit=${fit}&f=center&fm=webp&q=90`;

  if (height) {
    url += `&h=${height}`;
  }

  return url;
};

function renderRichText(node, includes) {
  if (!node) {
    return '';
  }

  if (node.nodeType === 'text') {
    let text = escapeHtml(node.value || '');

    (node.marks || []).forEach((mark) => {
      if (mark.type === 'bold') text = `<strong>${text}</strong>`;
      if (mark.type === 'italic') text = `<em>${text}</em>`;
    });

    return text;
  }

  const children = (node.content || []).map((n) => renderRichText(n, includes)).join('');

  switch (node.nodeType) {
    case 'document':
      return children;
    case 'paragraph':
      return children.trim() ? `<p>${children}</p>` : '';
    case 'heading-1':
    case 'heading-2':
      return `<h2>${children}</h2>`;
    case 'heading-3':
    case 'heading-4':
      return `<h3>${children}</h3>`;
    case 'unordered-list':
      return `<ul>${children}</ul>`;
    case 'ordered-list':
      return `<ol>${children}</ol>`;
    case 'list-item':
      return `<li>${children}</li>`;
    case 'blockquote':
      return `<blockquote>${children}</blockquote>`;
    case 'hr':
      return '<hr>';
    case 'hyperlink':
      return `<a href="${escapeHtml(node.data?.uri || '#')}" target="_blank" rel="noopener">${children}</a>`;
    case 'embedded-asset-block': {
      const url = getAssetUrl(includes, node.data?.target?.sys?.id, 900, null, 'scale');

      return url ? `<figure><img src="${url}" alt="" loading="lazy" /></figure>` : '';
    }
    default:
      return children;
  }
}

async function fetchRelease(slug) {
  const url = `https://cdn.contentful.com/spaces/${SPACE_ID}/environments/${ENV}/entries?content_type=${CONTENT_TYPE}&fields.slug=${encodeURIComponent(slug)}&include=2&limit=1&access_token=${ACCESS_TOKEN}`;
  const res = await fetchWithTimeout(url);

  if (res.status === 400) {
    return { items: [] };
  }

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  return res.json();
}

const $ = (id) => document.getElementById(id);

function show(id) {
  $(id).classList.remove('d-none');
}

function renderContact(f) {
  const lines = [];

  if (f.mediaContactName) {
    lines.push(`<span>${escapeHtml(f.mediaContactName)}</span>`);
  }

  if (f.mediaContactEmail) {
    lines.push(`<a href="mailto:${escapeHtml(f.mediaContactEmail)}">${escapeHtml(f.mediaContactEmail)}</a>`);
  }

  if (f.mediaContactPhone) {
    lines.push(`<a href="tel:${escapeHtml(f.mediaContactPhone.replace(/\s+/g, ''))}">${escapeHtml(f.mediaContactPhone)}</a>`);
  }

  if (lines.length) {
    $('release_contact').innerHTML = lines.join('');
    show('release_contact_card');
  }
}

function renderRelease(entry, includes) {
  const f = entry.fields;
  const issuer = f.issuedBy || 'the issuing organisation';
  const date = fmtDate(f.releaseDate || entry.sys.createdAt);

  document.title = `${f.title} — Ferguson Media Newsroom`;

  const descMeta = document.querySelector('meta[name="description"]');

  if (descMeta && f.summary) {
    descMeta.setAttribute('content', f.summary);
  }

  $('breadcrumb_current').textContent = f.title.length > 50 ? `${f.title.substring(0, 50)}…` : f.title;
  $('release_date').textContent = date;
  $('release_issuer_chip').textContent = `Issued by ${issuer}`;
  show('release_meta_top');
  $('release_title').textContent = f.title;

  if (f.summary) {
    $('release_summary').textContent = f.summary;
    show('release_summary');
  }

  const imgUrl = getAssetUrl(includes, f.heroImage?.sys?.id, 1400, 788, 'fill');

  if (imgUrl) {
    $('release_hero_image').src = imgUrl;
    $('release_hero_image').alt = f.title;
    $('release_hero_caption').textContent = f.imageCredits || `Image: ${issuer}`;
    show('release_hero_img');
  }

  $('release_disclosure').textContent = `This media release was issued by ${issuer} and is republished here with full credit. It was not written by Ferguson Media.`;
  show('release_disclosure');

  let bodyHtml = '';

  if (f.body && f.body.nodeType === 'document') {
    bodyHtml = renderRichText(f.body, includes);
  } else if (typeof f.body === 'string') {
    bodyHtml = f.body.split('\n\n').map((p) => `<p>${escapeHtml(p)}</p>`).join('');
  }

  $('release_body').innerHTML = bodyHtml || `<p>${escapeHtml(f.summary || '')}</p>`;

  $('release_info_issuer').textContent = issuer;
  $('release_info_date').textContent = date;

  if (f.originalUrl) {
    $('release_info_original').href = f.originalUrl;
    show('release_info_original_row');
  }

  renderContact(f);
  initShareButtons(f.title);
}

function initShareButtons(title) {
  const shareUrl = encodeURIComponent(window.location.href);
  const targets = {
    x: `https://twitter.com/intent/tweet?url=${shareUrl}&text=${encodeURIComponent(title)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`,
  };

  document.querySelectorAll('[data-share]').forEach((btn) => {
    btn.addEventListener('click', () => window.open(targets[btn.dataset.share], '_blank'));
  });

  const copyBtn = $('copy_link_btn');

  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      copyBtn.textContent = '✓ Link Copied!';
    });
  });
}

function renderError(msg) {
  document.title = 'Release Not Found — Ferguson Media Newsroom';
  $('release_title').textContent = 'Release Not Found';
  $('breadcrumb_current').textContent = 'Not Found';
  $('release_sidebar').classList.add('d-none');
  $('release_body').innerHTML = `<div class="article-error"><div class="article-error-title">Release Not Found</div><p class="article-error-body">${escapeHtml(msg)}</p><a href="/newsroom/" class="article-error-btn">Back to Newsroom</a></div>`;
}

async function init() {
  const slug = new URLSearchParams(window.location.search).get('slug');

  if (!slug) {
    renderError('No release was specified.');
    dismissLoader();
    return;
  }

  try {
    const data = await fetchRelease(slug);

    if (!data.items || data.items.length === 0) {
      renderError("We couldn't find this release. It may have been removed or the link may be incorrect.");
      return;
    }

    renderRelease(data.items[0], data.includes || {});
  } catch (err) {
    console.error('Release fetch error:', err);
    renderError('Could not load this release. Please check your connection and try again.');
  } finally {
    dismissLoader();
  }
}

init();
