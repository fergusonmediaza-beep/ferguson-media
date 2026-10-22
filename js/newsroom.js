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

const PAGE_SIZE = 10;

// Plain text of a rich-text body, so search can match words inside a release
const richTextToText = (node) => {
  if (!node) {
    return '';
  }

  if (node.nodeType === 'text') {
    return node.value || '';
  }

  return (node.content || []).map(richTextToText).join(' ');
};

const state = { all: [], query: '', org: '', shown: PAGE_SIZE };

const els = {};

function matches(entry) {
  const f = entry.fields;

  if (state.org && f.issuedBy !== state.org) {
    return false;
  }

  if (!state.query) {
    return true;
  }

  return entry.searchText.includes(state.query);
}

function render() {
  const filtered = state.all.filter(matches);
  const filtering = Boolean(state.query || state.org);
  const visible = filtered.slice(0, state.shown);

  els.list.innerHTML = visible.map(renderItem).join('');
  els.list.classList.toggle('d-none', filtered.length === 0);
  els.nomatch.classList.toggle('d-none', filtered.length > 0);
  els.more.classList.toggle('d-none', filtered.length <= state.shown);

  const total = state.all.length;
  const noun = total === 1 ? 'release' : 'releases';

  els.count.textContent = filtering
    ? `Showing ${filtered.length} of ${total} ${noun}`
    : `${total} ${noun}`;
}

function buildOrgFilter() {
  const orgs = [...new Set(state.all.map((e) => e.fields.issuedBy).filter(Boolean))]
    .sort((x, y) => x.localeCompare(y));

  els.org.insertAdjacentHTML('beforeend', orgs.map((o) => `<option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`).join(''));
}

function initControls() {
  let timer = null;

  els.search.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      state.query = els.search.value.trim().toLowerCase();
      state.shown = PAGE_SIZE;
      render();
    }, 150);
  });

  els.org.addEventListener('change', () => {
    state.org = els.org.value;
    state.shown = PAGE_SIZE;
    render();
  });

  els.more.addEventListener('click', () => {
    state.shown += PAGE_SIZE;
    render();
  });

  els.clear.addEventListener('click', () => {
    els.search.value = '';
    els.org.value = '';
    state.query = '';
    state.org = '';
    state.shown = PAGE_SIZE;
    render();
    els.search.focus();
  });
}

async function init() {
  ['list', 'empty', 'error', 'tools', 'search', 'org', 'count', 'more', 'nomatch', 'clear']
    .forEach((k) => { els[k] = document.getElementById(`nr_${k}`); });

  try {
    const data = await fetchReleases();
    const items = data.items || [];

    if (items.length === 0) {
      els.list.classList.add('d-none');
      els.empty.classList.remove('d-none');
      return;
    }

    state.all = items.map((entry) => {
      const f = entry.fields;
      entry.searchText = [f.title, f.issuedBy, f.summary, richTextToText(f.body)].join(' ').toLowerCase();
      return entry;
    });

    buildOrgFilter();
    initControls();
    els.tools.classList.remove('d-none');
    els.count.classList.remove('d-none');
    render();
  } catch (err) {
    console.error('Newsroom fetch error:', err);
    els.list.classList.add('d-none');
    els.error.classList.remove('d-none');
  } finally {
    dismissLoader();
  }
}

init();
