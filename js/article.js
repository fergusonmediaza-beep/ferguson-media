/* global fetchWithTimeout, dismissLoader */

/*
  Good News Story article page, driven entirely by a `?slug=` query
  param against Contentful. The hero (breadcrumb, category/date/author,
  title, excerpt, image), the body, and the sidebar are all real
  elements in the static HTML — this function only ever sets text,
  attributes, and toggles `d-none`, it never creates the <h1> or any
  other element itself. That's what guarantees a real <h1> exists in
  the raw HTML immediately, independent of whether this fetch ever
  resolves.
*/

const SPACE_ID = 'xjj6th2dvsr4';
const ACCESS_TOKEN = '8rJjUik38woui3raQ_eZ_wbWhlMG3io69cYUn-lqKKo';
const ENV = 'master';
const CONTENT_TYPE = 'goodNewsStory';

const CAT_LABELS = {
  youthExcellence: 'Youth Excellence',
  innovationSolutions: 'Innovation & Solutions',
  socialCohesion: 'Social Cohesion',
  economicImpact: 'Economic Impact',
};

const fmtDate = (iso) => new Date(iso).toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' });

const getAssetUrl = (includes, id, width = 1200, height = null, fit = 'fill') => {
  if (!includes || !includes.Asset) {
    return null;
  }

  const asset = includes.Asset.find((a) => a.sys.id === id);

  if (!asset) {
    return null;
  }

  let url = `https:${asset.fields.file.url}?w=${width}&fit=${fit}&f=center&fm=webp&q=90`;

  if (height) {
    url += `&h=${height}`;
  }

  return url;
};

const imgFallback = (el) => {
  el.onerror = null;
  el.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 400'%3E%3Crect width='800' height='400' fill='%23F4F2EE'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23aaa' font-size='20' font-family='sans-serif'%3EFerguson Media%3C/text%3E%3C/svg%3E";
};

const escapeHtml = (str) => str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function renderRichText(node, includes) {
  if (!node) {
    return '';
  }

  if (node.nodeType === 'text') {
    let text = escapeHtml(node.value || '');

    if (node.marks) {
      node.marks.forEach((mark) => {
        if (mark.type === 'bold') text = `<strong>${text}</strong>`;
        if (mark.type === 'italic') text = `<em>${text}</em>`;
        if (mark.type === 'code') text = `<code>${text}</code>`;
      });
    }

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
      return `<a href="${node.data?.uri || '#'}" target="_blank" rel="noopener">${children}</a>`;
    case 'embedded-asset-block': {
      const id = node.data?.target?.sys?.id;

      if (!id) {
        return '';
      }

      const url = getAssetUrl(includes, id, 900, null, 'scale');

      return url ? `<figure><img src="${url}" alt="" loading="lazy" onerror="imgFallback(this)" /></figure>` : '';
    }
    default:
      return children;
  }
}

async function fetchStory(slug) {
  const url = `https://cdn.contentful.com/spaces/${SPACE_ID}/environments/${ENV}/entries?content_type=${CONTENT_TYPE}&fields.slug=${encodeURIComponent(slug)}&include=2&limit=1&access_token=${ACCESS_TOKEN}`;
  const res = await fetchWithTimeout(url);

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  return res.json();
}

async function fetchMoreStories(category, excludeSlug) {
  try {
    const url = `https://cdn.contentful.com/spaces/${SPACE_ID}/environments/${ENV}/entries?content_type=${CONTENT_TYPE}&fields.category=${category}&order=-sys.createdAt&limit=4&include=1&access_token=${ACCESS_TOKEN}`;
    const res = await fetchWithTimeout(url);

    if (!res.ok) {
      return null;
    }

    const data = await res.json();

    return {
      items: (data.items || []).filter((s) => s.fields.slug !== excludeSlug).slice(0, 3),
      includes: data.includes,
    };
  } catch {
    return null;
  }
}

const els = {};

function cacheEls() {
  [
    'breadcrumb_cat', 'breadcrumb_cat_sep', 'breadcrumb_current',
    'article_meta_top', 'article_cat_badge', 'article_date', 'article_author_name',
    'article_title', 'article_excerpt', 'article_hero_img', 'article_hero_image', 'article_hero_caption',
    'article_body', 'article_sidebar',
    'story_info_category', 'story_info_published', 'story_info_author',
    'more_stories_root', 'page_loader',
  ].forEach((id) => { els[id] = document.getElementById(id); });
}

function renderArticle(story, includes) {
  const f = story.fields;
  const cat = CAT_LABELS[f.category] || 'Good News';
  const date = f.publishedDate ? fmtDate(f.publishedDate) : fmtDate(story.sys.createdAt);
  const author = f.authorName || 'Ferguson Media';
  const imgId = f.heroImage?.sys?.id;
  const imgUrl = imgId ? (getAssetUrl(includes, imgId, 1400, 788, 'fill') || '/images/placeholder.webp') : '/images/placeholder.webp';

  let bodyHtml = '';

  if (f.body && typeof f.body === 'object' && f.body.nodeType === 'document') {
    bodyHtml = renderRichText(f.body, includes);
  } else if (typeof f.body === 'string') {
    bodyHtml = f.body.split('\n\n').map((p) => `<p>${p}</p>`).join('');
  }

  if (!bodyHtml) {
    bodyHtml = `<p>${f.excerpt || ''}</p>`;
  }

  document.title = `${f.title} — Ferguson Media`;

  const descMeta = document.querySelector('meta[name="description"]');

  if (descMeta && f.excerpt) {
    descMeta.setAttribute('content', f.excerpt);
  }

  els.breadcrumb_cat.href = `/news/?category=${f.category}`;
  els.breadcrumb_cat.textContent = cat;
  els.breadcrumb_cat.classList.remove('d-none');
  els.breadcrumb_cat_sep.classList.remove('d-none');
  els.breadcrumb_current.textContent = f.title.length > 50 ? `${f.title.substring(0, 50)}…` : f.title;

  els.article_cat_badge.textContent = cat;
  els.article_date.textContent = date;
  els.article_author_name.textContent = author;
  els.article_meta_top.classList.remove('d-none');

  els.article_title.textContent = f.title;

  if (f.excerpt) {
    els.article_excerpt.textContent = f.excerpt;
    els.article_excerpt.classList.remove('d-none');
  }

  els.article_hero_image.src = imgUrl;
  els.article_hero_image.alt = f.title;
  els.article_hero_image.onerror = () => imgFallback(els.article_hero_image);
  els.article_hero_caption.textContent = `Ferguson Media — ${cat}`;
  els.article_hero_img.classList.remove('d-none');

  els.article_body.innerHTML = bodyHtml;

  els.story_info_category.textContent = cat;
  els.story_info_published.textContent = date;
  els.story_info_author.textContent = author;

  initShareButtons(f.title);
}

function initShareButtons(title) {
  const shareUrl = encodeURIComponent(window.location.href);
  const shareTitle = encodeURIComponent(title);

  const targets = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`,
    x: `https://twitter.com/intent/tweet?url=${shareUrl}&text=${shareTitle}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`,
  };

  document.querySelectorAll('[data-share]').forEach((btn) => {
    btn.addEventListener('click', () => window.open(targets[btn.dataset.share], '_blank'));
  });

  const copyBtn = document.getElementById('copy_link_btn');

  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(window.location.href);
      copyBtn.textContent = '✓ Link Copied!';
    });
  }
}

function renderMoreStories(data, currentSlug) {
  if (!data || !data.items || data.items.length === 0) {
    return;
  }

  const cat = data.items[0]?.fields?.category;
  const catLabel = CAT_LABELS[cat] || 'Good News';

  const cards = data.items.map((s) => {
    const f = s.fields;
    const slug = f.slug || s.sys.id;
    const imgId = f.heroImage?.sys?.id;
    const imgUrl = imgId ? (getAssetUrl(data.includes, imgId, 800, 450, 'fill') || '/images/placeholder.webp') : '/images/placeholder.webp';
    const scat = CAT_LABELS[f.category] || 'Good News';

    return `<a href="/article/?slug=${slug}" class="ms-card"><div class="ms-img"><img src="${imgUrl}" alt="${f.title}" width="800" height="450" loading="lazy" onerror="imgFallback(this)"/><span class="ms-cat">${scat}</span></div><div class="ms-body"><div class="ms-title">${f.title}</div><p class="ms-exc">${f.excerpt || ''}</p></div></a>`;
  }).join('');

  els.more_stories_root.innerHTML = `<section class="more-stories"><div class="container"><div class="more-stories-hd"><h2 class="more-stories-title">More in ${catLabel}</h2><a href="/news/?category=${cat}" class="more-stories-link">View All <svg viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg></a></div><div class="more-stories-grid">${cards}</div></div></section>`;
}

function renderError(msg) {
  document.title = 'Story Not Found — Ferguson Media';
  els.article_title.textContent = 'Story Not Found';
  els.breadcrumb_current.textContent = 'Not Found';
  els.article_sidebar.classList.add('d-none');
  els.article_body.innerHTML = `<div class="article-error"><div class="article-error-icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div><div class="article-error-title">Story Not Found</div><p class="article-error-body">${msg || "We couldn't find this story. It may have been moved or the link may be incorrect."}</p><a href="/news/" class="article-error-btn">Back to Good News Portal</a></div>`;
}

async function init() {
  cacheEls();

  const slug = new URLSearchParams(window.location.search).get('slug');

  if (!slug) {
    renderError('No story slug provided.');
    dismissLoader();
    return;
  }

  try {
    const data = await fetchStory(slug);

    if (!data.items || data.items.length === 0) {
      renderError(`No story found with slug "${slug}".`);
      dismissLoader();
      return;
    }

    const story = data.items[0];
    const includes = data.includes || {};

    renderArticle(story, includes);

    const more = await fetchMoreStories(story.fields.category, slug);

    if (more && more.items.length > 0) {
      renderMoreStories(more, slug);
    }
  } catch (err) {
    console.error('Article fetch error:', err);
    renderError('Could not load this story. Please check your connection and try again.');
  } finally {
    dismissLoader();
  }
}

init();
