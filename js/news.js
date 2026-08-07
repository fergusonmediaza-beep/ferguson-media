/* global fetchWithTimeout */

/*
  Page-specific behaviour for /news/: fetches stories from Contentful
  (falling back to placeholder data if the request fails), renders the
  featured/secondary/grid layout, and drives the category → subcategory
  → format progressive-disclosure filter bar plus sort/view/search-via-
  URL-params and load-more pagination. Shared chrome (loader, cookie
  bar, navbar scroll, offcanvas sidebar, reveal-on-scroll) is handled
  by main.js.

  The filter bar's 3-level disclosure used to be driven by JS setting
  element.style.display directly, which needed !important in the CSS
  to force everything hidden below the 900px breakpoint (a stylesheet
  rule can only override an inline style with !important). Here it's
  driven by a single data-level attribute on #filters_bar instead, so
  the CSS breakpoint rule can just be a plain, non-!important rule.
*/

const filtersBar = document.getElementById('filters_bar');

/* Contentful config */
const SPACE_ID = 'xjj6th2dvsr4';
const ACCESS_TOKEN = '8rJjUik38woui3raQ_eZ_wbWhlMG3io69cYUn-lqKKo';
const ENV = 'master';
const CONTENT_TYPE = 'goodNewsStory';
const PAGE_SIZE = 6;

const CAT_LABELS = {
  youthExcellence: 'Youth Excellence',
  innovationSolutions: 'Innovation & Solutions',
  socialCohesion: 'Social Cohesion',
  economicImpact: 'Economic Impact',
};
const FMT_LABELS = {
  profile: 'Profile',
  'case-study': 'Case Study',
  opinion: 'Opinion',
  'event-coverage': 'Event Coverage',
};
const SUB_LABELS = {
  entrepreneurship: 'Entrepreneurship',
  'tech-digital': 'Tech & Digital',
  sustainability: 'Sustainability',
  'education-skills': 'Education & Skills',
  'creative-arts': 'Creative Arts',
  'sport-wellness': 'Sport & Wellness',
  'community-advocacy': 'Community Advocacy',
  'investment-csr': 'Investment & CSR',
};
const CAT_SUBCATS = {
  youthExcellence: ['education-skills', 'creative-arts', 'sport-wellness'],
  innovationSolutions: ['tech-digital', 'sustainability'],
  economicImpact: ['entrepreneurship', 'investment-csr'],
  socialCohesion: ['community-advocacy'],
};

/* Placeholder data, used only if the Contentful fetch fails */
const PLACEHOLDER_STORIES = [
  { id: '1', fields: { title: 'Birthday Celebration Turns Into Surprise Book Launch', slug: 'birthday-book-launch', category: 'youthExcellence', excerpt: 'Young siblings Oyama and Prince launched their latest books on a milestone birthday, celebrating the power of youth creativity and storytelling in their community.', authorName: 'Ferguson Media', publishedDate: '2026-03-10T00:00:00Z' } },
  { id: '2', fields: { title: 'Free Bus Travel Programme Helps Thousands of Jobseekers', slug: 'free-bus-travel-jobseekers', category: 'economicImpact', excerpt: 'A Cape Town initiative is removing transport barriers for thousands of job seekers, connecting communities to economic opportunity one bus ride at a time.', authorName: 'Thembinkosi Dlamini', publishedDate: '2026-02-28T00:00:00Z' } },
  { id: '3', fields: { title: 'Indoni Initiative Develops Skills of Young People', slug: 'indoni-youth-skills', category: 'youthExcellence', excerpt: 'The Indoni initiative is giving South African youth the creative and professional skills they need to lead with confidence in the modern economy.', authorName: 'Pamela Morare', publishedDate: '2026-03-05T00:00:00Z' } },
  { id: '4', fields: { title: 'Township Innovator Builds Solar-Powered Water Pump from Scrap', slug: 'township-solar-pump', category: 'innovationSolutions', excerpt: 'A Soweto engineer has designed a low-cost solar water pump using reclaimed materials, now providing clean water to over 200 households.', authorName: 'Sinethemba Zondi', publishedDate: '2026-02-14T00:00:00Z' } },
  { id: '5', fields: { title: 'Community Garden Network Feeds 500 Families Across Gauteng', slug: 'community-garden-network', category: 'socialCohesion', excerpt: 'A growing network of community gardens is proving that neighbours working together can solve food insecurity one harvest at a time.', authorName: 'Ferguson Media', publishedDate: '2026-01-22T00:00:00Z' } },
  { id: '6', fields: { title: 'Young Entrepreneur Turns Waste Plastic Into School Furniture', slug: 'plastic-school-furniture', category: 'innovationSolutions', excerpt: 'A 24-year-old from Khayelitsha is converting plastic waste into durable school desks, supplying over 15 schools across the Western Cape.', authorName: 'Thobani Madlala', publishedDate: '2026-03-01T00:00:00Z' } },
  { id: '7', fields: { title: 'Rural Clinic Run Entirely by Local Youth Celebrates First Year', slug: 'rural-clinic-youth', category: 'socialCohesion', excerpt: 'A community clinic in Limpopo, staffed by trained young volunteers, has completed its first full year of free primary healthcare services.', authorName: 'Ferguson Media', publishedDate: '2026-02-18T00:00:00Z' } },
];

/* State */
let allStories = [];
let filtered = [];
let currentPage = 1;
let activeFilter = 'all';
let activeSubCat = 'all';
let activeFormat = 'all';
let activeSort = 'newest';
let isListView = false;
let usingPlaceholders = false;
let contentfulData = null;

/* Utils */
const fmtDate = (iso) => new Date(iso).toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' });

const getImg = (data, id) => {
  if (!data?.includes?.Asset) {
    return null;
  }

  const asset = data.includes.Asset.find((x) => x.sys.id === id);
  return asset ? `https:${asset.fields.file.url}` : null;
};

const getStoryImg = (story, data) => {
  const ref = story.fields.heroImage;

  if (!ref?.sys) {
    return '/images/placeholder.webp';
  }

  return getImg(data, ref.sys.id) || '/images/placeholder.webp';
};

window.imgErr = (el) => {
  el.onerror = null;
  el.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 500'%3E%3Crect width='800' height='500' fill='%23F4F2EE'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23aaa' font-size='20' font-family='sans-serif'%3EFerguson Media%3C/text%3E%3C/svg%3E";
};

/* Fetch — fetchWithTimeout is provided globally by main.js */
async function fetchStories() {
  try {
    const res = await fetchWithTimeout(`https://cdn.contentful.com/spaces/${SPACE_ID}/environments/${ENV}/entries?content_type=${CONTENT_TYPE}&include=1&limit=100&access_token=${ACCESS_TOKEN}`);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    contentfulData = data;
    allStories = data.items || [];
    document.getElementById('hero_story_count').textContent = allStories.length;
  } catch (err) {
    console.error('Contentful:', err);
    document.getElementById('error_banner').classList.add('show');
    usingPlaceholders = true;
    contentfulData = { items: PLACEHOLDER_STORIES, includes: { Asset: [] } };
    allStories = PLACEHOLDER_STORIES;
  }
}

/* Filter + sort */
function applyFilterSort() {
  let result = [...allStories];

  if (activeFilter !== 'all') {
    result = result.filter((s) => s.fields.category === activeFilter);
  }

  if (activeSubCat !== 'all') {
    result = result.filter((s) => s.fields.subCategory === activeSubCat);
  }

  if (activeFormat !== 'all') {
    result = result.filter((s) => s.fields.contentFormat === activeFormat);
  }

  result.sort((a, b) => {
    const dateA = new Date(a.fields.publishedDate || 0);
    const dateB = new Date(b.fields.publishedDate || 0);
    return activeSort === 'newest' ? dateB - dateA : dateA - dateB;
  });

  filtered = result;
  currentPage = 1;
}

function showCategoryLevel() {
  filtersBar.dataset.level = 'category';
}

function showSubCatLevel(category) {
  const tabs = document.getElementById('sub_cat_tabs');
  const mobileSelect = document.getElementById('sub_cat_select_mobile');
  const subcats = CAT_SUBCATS[category] || [];

  tabs.innerHTML = `<button class="filter-tab-sub active" data-sub="all">All ${CAT_LABELS[category]}</button>${subcats.map((s) => `<button class="filter-tab-sub" data-sub="${s}">${SUB_LABELS[s]}</button>`).join('')}`;
  mobileSelect.innerHTML = `<option value="all">All ${CAT_LABELS[category]}</option>${subcats.map((s) => `<option value="${s}">${SUB_LABELS[s]}</option>`).join('')}`;

  filtersBar.dataset.level = 'subcategory';

  tabs.querySelectorAll('.filter-tab-sub').forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.querySelectorAll('.filter-tab-sub').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      activeSubCat = tab.dataset.sub;

      if (activeSubCat !== 'all') {
        showFormatLevel();
      } else {
        filtersBar.dataset.level = 'subcategory';
        activeFormat = 'all';
      }

      applyFilterSort();
      render();
    });
  });

  mobileSelect.onchange = function onSubCatMobileChange() {
    activeSubCat = this.value;

    if (activeSubCat !== 'all') {
      filtersBar.dataset.level = 'format';
    } else {
      filtersBar.dataset.level = 'subcategory';
      activeFormat = 'all';
    }

    applyFilterSort();
    render();
  };
}

function showFormatLevel() {
  filtersBar.dataset.level = 'format';
}

document.getElementById('sub_cat_back').addEventListener('click', () => {
  activeFilter = 'all';
  activeSubCat = 'all';
  activeFormat = 'all';
  document.querySelectorAll('.filter-tab').forEach((t) => t.classList.toggle('active', t.dataset.cat === 'all'));
  showCategoryLevel();
  applyFilterSort();
  render();
});

/* Build cards */
function buildHeroFeature(s) {
  const f = s.fields;
  const img = usingPlaceholders ? '/images/placeholder.webp' : getStoryImg(s, contentfulData);
  const cat = CAT_LABELS[f.category] || 'Good News';
  const slug = f.slug || s.id || s.sys?.id;
  const date = f.publishedDate ? fmtDate(f.publishedDate) : '';

  return `<a href="/article/?slug=${slug}" class="hero-feature"><img src="${img}" alt="${f.title}" width="1200" height="560" loading="eager" onerror="imgErr(this)"/><div class="hero-feature-overlay"></div><div class="hero-feature-accent"></div><div class="hero-feature-body"><span class="hero-feature-cat">${cat}</span><h2 class="hero-feature-title">${f.title}</h2><p class="hero-feature-exc">${f.excerpt || ''}</p><div class="hero-feature-bottom"><div class="hero-feature-meta"><span class="hero-feature-author">${f.authorName || 'Ferguson Media'}</span>${date ? `<div class="hero-feature-sep"></div><span class="hero-feature-date">${date}</span>` : ''}</div><span class="hero-feature-btn">Read Story <svg viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg></span></div></div></a>`;
}

function buildSecCard(s) {
  const f = s.fields;
  const img = usingPlaceholders ? '/images/placeholder.webp' : getStoryImg(s, contentfulData);
  const slug = f.slug || s.id || s.sys?.id;

  return `<a href="/article/?slug=${slug}" class="sec-card"><img src="${img}" alt="${f.title}" width="400" height="300" loading="lazy" onerror="imgErr(this)"/><div class="sec-card-overlay"></div><div class="sec-card-arrow"><svg viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg></div><div class="sec-card-body"><span class="sec-card-cat">${CAT_LABELS[f.category] || 'Good News'}</span><h3 class="sec-card-title">${f.title}</h3><p class="sec-card-exc">${f.excerpt || ''}</p></div></a>`;
}

function buildCard(s, i) {
  const f = s.fields;
  const img = usingPlaceholders ? '/images/placeholder.webp' : getStoryImg(s, contentfulData);
  const slug = f.slug || s.id || s.sys?.id;
  const delays = ['d1', 'd2', 'd3', 'd4', 'd5', 'd6'];
  const fmtBadge = FMT_LABELS[f.contentFormat] ? `<span class="sc-fmt">${FMT_LABELS[f.contentFormat]}</span>` : '';

  return `<a href="/article/?slug=${slug}" class="story-card rv ${delays[i % 6] || ''}"><div class="sc-img"><img src="${img}" alt="${f.title}" width="800" height="500" loading="lazy" onerror="imgErr(this)"/><span class="sc-cat">${CAT_LABELS[f.category] || 'Good News'}</span></div><div class="sc-body">${fmtBadge}<h3 class="sc-title">${f.title}</h3><p class="sc-exc">${f.excerpt || ''}</p><div class="sc-meta"><span class="sc-author">${f.authorName || 'Ferguson Media'}</span><div class="sc-arrow"><svg viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg></div></div></div></a>`;
}

/* Render */
function render() {
  const featured = document.getElementById('featured_slot');
  const secondary = document.getElementById('secondary_slot');
  const grid = document.getElementById('stories_grid');
  const loadMoreWrap = document.getElementById('load_more_wrap');
  const countBar = document.getElementById('story_count_bar');
  const heroCount = document.getElementById('hero_story_count');

  heroCount.textContent = allStories.length > 0 ? allStories.length : '—';

  const total = filtered.length;
  const catName = activeFilter === 'all' ? 'All Stories' : (CAT_LABELS[activeFilter] || activeFilter);
  countBar.innerHTML = `Showing <span>${total}</span> ${total === 1 ? 'story' : 'stories'} in <span>${catName}</span>`;

  if (total === 0) {
    featured.innerHTML = '';
    secondary.innerHTML = '';
    grid.innerHTML = '<div class="empty-state"><div class="empty-icon"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></div><div class="empty-title">No stories found</div><p class="empty-body">Try a different category or check back soon.</p></div>';
    loadMoreWrap.style.display = 'none';
    document.getElementById('grid_label_slot').innerHTML = '';
    return;
  }

  featured.innerHTML = buildHeroFeature(filtered[0]);
  secondary.innerHTML = filtered.length >= 2 ? `<div class="secondary-row">${filtered.slice(1, 3).map(buildSecCard).join('')}</div>` : '';

  const gridStories = filtered.slice(3);
  const toShow = gridStories.slice(0, currentPage * PAGE_SIZE);
  const labelSlot = document.getElementById('grid_label_slot');

  if (toShow.length > 0) {
    labelSlot.innerHTML = '<div class="portal-grid-label"><div class="portal-grid-label-line"></div><span class="portal-grid-label-text">More Stories</span><div class="portal-grid-label-line"></div></div>';
    grid.className = `stories-grid${isListView ? ' view-list' : ''}`;
    grid.innerHTML = toShow.map((s, i) => buildCard(s, i)).join('');
  } else {
    labelSlot.innerHTML = '';
    grid.className = 'stories-grid';
    grid.innerHTML = '';
  }

  loadMoreWrap.style.display = toShow.length < gridStories.length ? 'block' : 'none';
  observeAll();
}

// re-observe newly-injected cards each render — main.js's shared
// observer only saw whatever .rv elements existed on DOMContentLoaded,
// which is none of the Contentful-driven content rendered here
function observeAll() {
  document.querySelectorAll('.rv, .rv-l, .rv-f').forEach((el) => window.fmRevealObserver?.observe(el));
}

/* Init */
async function init() {
  await fetchStories();
  applyFilterSort();
  render();

  const params = new URLSearchParams(window.location.search);
  const category = params.get('category');
  const subCategory = params.get('subCategory');

  if (category && CAT_LABELS[category]) {
    activeFilter = category;
    document.querySelectorAll('.filter-tab').forEach((t) => t.classList.toggle('active', t.dataset.cat === category));
    showSubCatLevel(category);
    applyFilterSort();
    render();
  }

  if (subCategory && SUB_LABELS[subCategory]) {
    const parentCat = Object.keys(CAT_SUBCATS).find((cat) => CAT_SUBCATS[cat].includes(subCategory));

    if (parentCat) {
      activeFilter = parentCat;
      activeSubCat = subCategory;
      document.querySelectorAll('.filter-tab').forEach((t) => t.classList.toggle('active', t.dataset.cat === parentCat));
      showSubCatLevel(parentCat);

      const subTab = document.querySelector(`#sub_cat_tabs [data-sub="${subCategory}"]`);

      if (subTab) {
        document.querySelectorAll('#sub_cat_tabs .filter-tab-sub').forEach((t) => t.classList.remove('active'));
        subTab.classList.add('active');
      }

      document.getElementById('sub_cat_select_mobile').value = subCategory;
      showFormatLevel();
    }

    applyFilterSort();
    render();
  }
}

init();

/* Controls */
document.querySelectorAll('.filter-tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.filter-tab').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    activeFilter = tab.dataset.cat;
    activeSubCat = 'all';
    activeFormat = 'all';

    if (activeFilter === 'all') {
      showCategoryLevel();
    } else {
      showSubCatLevel(activeFilter);
    }

    applyFilterSort();
    render();
  });
});

document.querySelectorAll('.filter-tab-fmt').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.filter-tab-fmt').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    activeFormat = tab.dataset.fmt;
    applyFilterSort();
    render();
  });
});

document.getElementById('sort_select').addEventListener('change', function onSortChange() {
  activeSort = this.value;
  applyFilterSort();
  render();
});

document.getElementById('filter_select_mobile').addEventListener('change', function onCategoryMobileChange() {
  activeFilter = this.value;
  activeSubCat = 'all';
  activeFormat = 'all';

  if (activeFilter === 'all') {
    showCategoryLevel();
  } else {
    showSubCatLevel(activeFilter);
  }

  applyFilterSort();
  render();
});

document.getElementById('format_select_mobile').addEventListener('change', function onFormatMobileChange() {
  activeFormat = this.value;
  applyFilterSort();
  render();
});

document.getElementById('view_grid').addEventListener('click', () => {
  isListView = false;
  document.getElementById('view_grid').classList.add('active');
  document.getElementById('view_list').classList.remove('active');
  document.getElementById('stories_grid').classList.remove('view-list');
});

document.getElementById('view_list').addEventListener('click', () => {
  isListView = true;
  document.getElementById('view_list').classList.add('active');
  document.getElementById('view_grid').classList.remove('active');
  document.getElementById('stories_grid').classList.add('view-list');
});

document.getElementById('load_more_btn').addEventListener('click', () => {
  currentPage += 1;
  render();
});

document.getElementById('retry_link').addEventListener('click', (e) => {
  e.preventDefault();
  location.reload();
});
