/* global fetchWithTimeout */

/*
  Homepage-only behaviour: the decorative hero background paths and the
  Contentful-backed featured-stories grid. Page loader, cookie bar,
  navbar scroll state, mobile offcanvas, and reveal-on-scroll are all
  handled by main.js — this file only adds newly-injected story cards
  to the reveal observer main.js already created (window.fmRevealObserver)
  rather than starting a second one.
*/

(function drawHeroPaths() {
  const svg = document.querySelector('.hero-path-svg');

  if (!svg || svg.children.length) {
    return;
  }

  [1, -1].forEach((pos) => {
    Array.from({ length: 36 }, (_, i) => {
      const d = `M-${380 - i * 5 * pos} -${189 + i * 6}C-${380 - i * 5 * pos} -${189 + i * 6} -${312 - i * 5 * pos} ${216 - i * 6} ${152 - i * 5 * pos} ${343 - i * 6}C${616 - i * 5 * pos} ${470 - i * 6} ${684 - i * 5 * pos} ${875 - i * 6} ${684 - i * 5 * pos} ${875 - i * 6}`;
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');

      path.setAttribute('d', d);
      path.setAttribute('stroke', '#FF7A00');
      path.setAttribute('stroke-width', 0.5 + i * 0.03);
      path.setAttribute('stroke-opacity', 0.1 + i * 0.03);
      path.setAttribute('fill', 'none');
      path.style.strokeDasharray = '800';
      path.style.animation = `pathDraw ${20 + ((i * 7) % 10)}s linear ${-(i * 1.1)}s infinite`;
      svg.appendChild(path);
    });
  });
})();

const SPACE_ID = 'xjj6th2dvsr4';
const ACCESS_TOKEN = '8rJjUik38woui3raQ_eZ_wbWhlMG3io69cYUn-lqKKo';
const ENV = 'master';
const CONTENT_TYPE = 'goodNewsStory';

const CAT_LABELS = {
  youthExcellence: 'Youth Excellence',
  innovationSolutions: 'Innovation',
  socialCohesion: 'Social Cohesion',
  economicImpact: 'Economic Impact',
};

const getAssetUrl = (data, id) => {
  if (!data.includes || !data.includes.Asset) {
    return null;
  }

  const asset = data.includes.Asset.find((a) => a.sys.id === id);

  return asset ? `https:${asset.fields.file.url}` : null;
};

const buildCard = (story, data, index) => {
  const f = story.fields;
  const imgId = f.heroImage && f.heroImage.sys ? f.heroImage.sys.id : null;
  const img = imgId ? (getAssetUrl(data, imgId) || '/images/placeholder.webp') : '/images/placeholder.webp';
  const delays = ['d1', 'd2', 'd3'];

  return `<a href="/article/?slug=${f.slug || story.sys.id}" class="story-card rv ${delays[index] || ''}"><div class="sc-img"><img src="${img}" alt="${f.title}" width="800" height="600" loading="lazy"/><span class="sc-cat">${CAT_LABELS[f.category] || 'Good News'}</span></div><div class="sc-body"><h3 class="sc-title">${f.title}</h3><p class="sc-exc">${f.excerpt || ''}</p><span class="sc-read">Read Full Story <svg viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg></span></div></a>`;
};

const placeholderStories = () => [
  { t: 'Birthday Celebration Turns Into Book Launch', c: 'Youth Excellence', e: 'Young siblings Oyama and Prince launched their latest books on a milestone birthday.' },
  { t: 'Free Bus Travel Helps Thousands of Jobseekers', c: 'Economic Impact', e: 'A Cape Town initiative removes transport barriers for job seekers across the city.' },
  { t: 'Indoni Initiative Develops Skills of Young People', c: 'Youth Excellence', e: 'The Indoni initiative gives South African youth the skills they need to lead.' },
].map((item, index) => `<a href="/news/" class="story-card rv d${index + 1}"><div class="sc-img"><img src="/images/placeholder.webp" alt="${item.t}" width="800" height="450" loading="lazy"/><span class="sc-cat">${item.c}</span></div><div class="sc-body"><h3 class="sc-title">${item.t}</h3><p class="sc-exc">${item.e}</p><span class="sc-read">Read Full Story <svg viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg></span></div></a>`).join('');

async function initStories() {
  const grid = document.getElementById('stories_grid');
  const loading = document.getElementById('stories_loading');

  try {
    let data = await (await fetchWithTimeout(
      `https://cdn.contentful.com/spaces/${SPACE_ID}/environments/${ENV}/entries?content_type=${CONTENT_TYPE}&fields.featured=true&order=-sys.createdAt&limit=3&include=1&access_token=${ACCESS_TOKEN}`
    )).json();

    if (!data.items || data.items.length < 3) {
      const needed = 3 - (data.items?.length || 0);
      const existingSlugs = (data.items || []).map((s) => s.fields.slug);
      const fallback = await (await fetchWithTimeout(
        `https://cdn.contentful.com/spaces/${SPACE_ID}/environments/${ENV}/entries?content_type=${CONTENT_TYPE}&order=-sys.createdAt&limit=${needed + existingSlugs.length}&include=1&access_token=${ACCESS_TOKEN}`
      )).json();
      const extras = (fallback.items || [])
        .filter((s) => !existingSlugs.includes(s.fields.slug))
        .slice(0, needed);

      data.items = [...(data.items || []), ...extras];

      if (!data.includes) {
        data.includes = fallback.includes;
      }
    }

    if (loading) {
      loading.remove();
    }

    grid.innerHTML = (!data.items || !data.items.length)
      ? placeholderStories()
      : data.items.map((s, i) => buildCard(s, data, i)).join('');
  } catch {
    if (loading) {
      loading.remove();
    }

    grid.innerHTML = placeholderStories();
  }

  if (window.fmRevealObserver) {
    grid.querySelectorAll('.rv').forEach((el) => window.fmRevealObserver.observe(el));
  }
}

initStories();
