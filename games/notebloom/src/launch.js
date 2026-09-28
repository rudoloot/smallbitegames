// Add reviewed partner origins here; never derive trust from returnTo/referrer.
export const PARTNER_ORIGINS = Object.freeze(['https://rudoloot.github.io']);

export function getReturnUrl(search, currentOrigin) {
  const raw = new URLSearchParams(search).get('returnTo');
  if (!raw) return null;
  try {
    // No base URL and no second decode: relative and double-encoded URLs fail.
    const target = new URL(raw);
    const allowed = new Set([currentOrigin, ...PARTNER_ORIGINS]);
    if (target.protocol !== 'https:' || !allowed.has(target.origin)) return null;
    if (target.username || target.password) return null;
    return target.href;
  } catch { return null; }
}

// Called only by explicit exit buttons. The current game has no score storage.
export function exitGame({ search, currentOrigin, stop, replace, showMenu }) {
  const target = getReturnUrl(search, currentOrigin);
  stop();
  if (target) replace(target);
  else showMenu();
}
