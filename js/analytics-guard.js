/*
  Skips GA4/Clarity initialization for automated traffic (headless
  browsers, known bot/crawler user agents) and defers real
  initialization until the visitor actually interacts with the page
  or a short grace period elapses. A load-and-leave bot hit never
  triggers a session this way, which is what inflates reports with
  high-volume, 0% engagement traffic (commonly geo-misattributed to
  a single country like Norway, a known bot-traffic hotspot).

  This is a client-side heuristic, not a network-level block -- a
  static GitHub Pages site has no server layer to filter traffic
  before it reaches the browser. Determined bots that fake user
  interaction can still get through; this stops the much larger
  volume of unsophisticated ones.
*/
(function () {
  const BOT_UA_PATTERN = /bot|crawl|spider|slurp|headless|phantom|selenium|puppeteer|playwright|curl|wget|python-requests|scrapy|mj12bot|dotbot|semrush|ahrefsbot/i;

  function isLikelyBot() {
    if (navigator.webdriver) return true;
    if (BOT_UA_PATTERN.test(navigator.userAgent)) return true;
    if (window.callPhantom || window._phantom || window.__nightmare) return true;
    return false;
  }

  if (isLikelyBot()) return;

  function initAnalytics() {
    if (typeof gtag === 'function') {
      gtag('config', 'G-QPZXX9FXNK');
    }

    window.clarity = window.clarity || function () { (window.clarity.q = window.clarity.q || []).push(arguments); };
    const clarityScript = document.createElement('script');
    clarityScript.async = true;
    clarityScript.src = 'https://www.clarity.ms/tag/y3rvvf8xt9';
    document.head.appendChild(clarityScript);
  }

  const interactionEvents = ['scroll', 'mousemove', 'keydown', 'touchstart', 'click'];
  let started = false;

  function start() {
    if (started) return;
    started = true;
    interactionEvents.forEach((evt) => document.removeEventListener(evt, start));
    clearTimeout(fallbackTimer);
    initAnalytics();
  }

  interactionEvents.forEach((evt) => document.addEventListener(evt, start, { passive: true }));
  const fallbackTimer = setTimeout(start, 4000);
})();
