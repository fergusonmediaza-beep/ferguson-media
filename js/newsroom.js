/* global fetchWithTimeout, dismissLoader */

/*
  Newsroom listing (/newsroom/). Fetches `pressRelease` entries from
  Contentful, newest first. Releases are organisations' own media
  releases, always credited to the issuing organisation — the
  Good News Portal (/news/) is reserved for stories written by the
  Ferguson Media team.

  A 400 from Contentful means the `pressRelease` content type doesn't
  exist yet, which is treated the same as "no releases published" so
  the page shows its empty state rather than an error.
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

async function fetchReleases() {
  const url = `https://cdn.contentful.com/spaces/${SPACE_ID}/environments/${ENV}/entries?content_type=${CONTENT_TYPE}&order=-fields.releaseDate&limit=100&access_token=${ACCESS_TOKEN}`;
  const res = await fetchWithTimeout(url);

  if (res.status === 400) {
    return { items: [] };
  }

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  return res.json();
}

function renderItem(entry) {
  const f = entry.fields;
  const slug = encodeURIComponent(f.slug || entry.sys.id);
  const date = fmtDate(f.releaseDate || entry.sys.createdAt);
  const summary = f.summary ? `<p class="nr-item-summary">${escapeHtml(f.summary)}</p>` : '';

  return `<a href="/newsroom/release/?slug=${slug}" class="nr-item">
    <div class="nr-item-meta"><span class="nr-item-issuer">${escapeHtml(f.issuedBy || 'Media release')}</span><span class="nr-item-date">${date}</span></div>
    <h2 class="nr-item-title">${escapeHtml(f.title || 'Untitled release')}</h2>
    ${summary}
    <span class="nr-item-more">Read release <svg viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg></span>
  </a>`;
}

async function init() {
  const list = document.getElementById('nr_list');
  const empty = document.getElementById('nr_empty');
  const error = document.getElementById('nr_error');

  try {
    const data = await fetchReleases();
    const items = data.items || [];

    if (items.length === 0) {
      list.classList.add('d-none');
      empty.classList.remove('d-none');
      return;
    }

    list.innerHTML = items.map(renderItem).join('');
  } catch (err) {
    console.error('Newsroom fetch error:', err);
    list.classList.add('d-none');
    error.classList.remove('d-none');
  } finally {
    dismissLoader();
  }
}

init();
