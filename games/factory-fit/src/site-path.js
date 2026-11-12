export function sitePath(path) {
  const current = new URL(location.href);
  const target = new URL(path, current);
  for (const key of ['returnTo', 'v']) {
    if (current.searchParams.has(key)) target.searchParams.set(key, current.searchParams.get(key));
  }
  return target.href;
}
