/*
  Forces the Mailchimp popup to re-evaluate every visitor as "new" on
  every visit, per explicit approval (2026-08). Mailchimp's own script
  remembers "seen/dismissed/subscribed" client-side; this wipes
  anything it stores under a Mailchimp-identifying key before its
  script (loaded right after this one) gets a chance to read it, so it
  always behaves as if this is the visitor's first time. No async/defer
  on the script tag loading this file -- it has to run synchronously,
  ahead of the mcjs tag, or it runs too late to matter.
*/

(function () {
  const patterns = ['chimp', 'mailchimp', '254736855', 'b52287d5115cea764975ab959'];
  const matches = (key) => {
    const lower = key.toLowerCase();
    return patterns.some((p) => lower.indexOf(p) !== -1);
  };

  try {
    Object.keys(localStorage).filter(matches).forEach((key) => localStorage.removeItem(key));
    Object.keys(sessionStorage).filter(matches).forEach((key) => sessionStorage.removeItem(key));
  } catch (e) { /* storage unavailable, e.g. private browsing */ }

  document.cookie.split(';').forEach((cookie) => {
    const name = cookie.split('=')[0].trim();
    if (name && matches(name)) {
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
    }
  });
})();
