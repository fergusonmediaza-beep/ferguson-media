/* global bootstrap */

/*
  Page-specific behaviour for /good-news-check-in/: category/host/year
  filtering plus free-text search over the episode grid, and the
  episode video modal (a themed Bootstrap Modal — the iframe src is
  set on show.bs.modal and cleared on hidden.bs.modal so the video
  actually stops playing no matter how the modal was closed: the close
  button, Escape, or a backdrop click, all funnel through the same
  event). Shared chrome (loader, cookie bar, navbar scroll, offcanvas
  sidebar, reveal-on-scroll) is handled by main.js.
*/

document.querySelectorAll('.filter-pill').forEach((pill) => {
  pill.addEventListener('click', () => {
    document.querySelectorAll('.filter-pill').forEach((p) => p.classList.remove('active'));
    pill.classList.add('active');
    applyFilters();
  });
});

function applyFilters() {
  const activeTag = document.querySelector('.filter-pill.active')?.dataset.filter || 'all';
  const host = document.getElementById('host_select').value;
  const year = document.getElementById('year_select').value;
  const query = document.getElementById('search_input').value.trim().toLowerCase();
  let visibleCount = 0;

  document.querySelectorAll('.ep-card').forEach((card) => {
    const tags = card.dataset.tags || '';
    const cardHost = card.dataset.host || '';
    const cardYear = card.dataset.year || '';
    const searchText = card.dataset.search || '';
    const title = card.querySelector('.ep-title')?.textContent.toLowerCase() || '';
    const desc = card.querySelector('.ep-desc')?.textContent.toLowerCase() || '';

    const tagOk = activeTag === 'all' || tags.includes(activeTag);
    const hostOk = host === 'all' || cardHost === host;
    const yearOk = year === 'all' || cardYear === year;
    const searchOk = !query || searchText.includes(query) || title.includes(query) || desc.includes(query);

    const matches = tagOk && hostOk && yearOk && searchOk;
    card.classList.toggle('hidden', !matches);

    if (matches) {
      visibleCount += 1;
    }
  });

  document.getElementById('no_results').style.display = visibleCount === 0 ? 'block' : 'none';
}

document.getElementById('host_select').addEventListener('change', applyFilters);
document.getElementById('year_select').addEventListener('change', applyFilters);

document.getElementById('filter_select_mobile').addEventListener('change', (e) => {
  const val = e.target.value;
  document.querySelectorAll('.filter-pill').forEach((p) => p.classList.toggle('active', p.dataset.filter === val));
  applyFilters();
  document.querySelector('.collection').scrollIntoView({ behavior: 'smooth', block: 'start' });
});

const doSearch = () => {
  applyFilters();
  document.querySelector('.collection').scrollIntoView({ behavior: 'smooth', block: 'start' });
};

document.getElementById('hero_search_btn').addEventListener('click', doSearch);

document.querySelectorAll('.hero-try-chip').forEach((chip) => {
  chip.addEventListener('click', () => {
    document.getElementById('search_input').value = chip.dataset.term;
    doSearch();
  });
});

document.getElementById('search_input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    doSearch();
  }
});

// YouTube placeholder detection — naturalWidth <= 120 means YouTube hasn't processed the thumbnail yet
window.ytThumb = (img, id) => {
  if (img.naturalWidth <= 120) {
    if (img.src.includes('maxresdefault')) {
      img.src = `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
    } else if (img.src.includes('hqdefault')) {
      img.src = `https://img.youtube.com/vi/${id}/mqdefault.jpg`;
    }
  }
};

// featured-card is a div (it wraps its own nested "Watch Episode"
// button, so it can't be a <button> itself) — give it the same
// keyboard affordance a real button would have.
const featuredCard = document.getElementById('featured_card');

featuredCard.addEventListener('keydown', (e) => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target === featuredCard) {
    e.preventDefault();
    featuredCard.click();
  }
});

const epModalEl = document.getElementById('ep_modal');
const epIframe = document.getElementById('ep_iframe');

epModalEl.addEventListener('show.bs.modal', (event) => {
  const trigger = event.relatedTarget;

  if (!trigger) {
    return;
  }

  const { videoId, tag, title, meta, start } = trigger.dataset;
  document.getElementById('ep_modal_tag').textContent = tag || '';
  document.getElementById('ep_modal_title').textContent = title || '';
  document.getElementById('ep_modal_meta').textContent = meta || '';
  epIframe.src = `https://www.youtube.com/embed/${videoId}${start || ''}?autoplay=1`;
});

epModalEl.addEventListener('hidden.bs.modal', () => {
  epIframe.src = '';
});
