export function externalLinkProps(url) {
  if (typeof url !== 'string') return null;
  const value = url.trim();
  if (!value || /\s/.test(value)) return null;
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || !parsed.hostname)
    return null;
  return { href: value, target: '_blank', rel: 'noopener noreferrer' };
}

export function validateHubUrl(value) {
  const v = String(value ?? '').trim();
  if (!v) return null;
  return externalLinkProps(v) ? null : 'invalid';
}

const isAppPath = (p) => typeof p === 'string' && p.startsWith('/app') && !p.startsWith('//');

export function resolveTile(tile) {
  if (!tile || typeof tile !== 'object' || !tile.id) return null;
  if (tile.status === 'soon') return { id: tile.id, mode: 'soon' };

  if (tile.kind === 'internal') {
    return isAppPath(tile.path) ? { id: tile.id, mode: 'internal', path: tile.path } : null;
  }

  if (tile.kind === 'external') {
    const links = [];
    for (const link of Array.isArray(tile.links) ? tile.links : []) {
      const props = externalLinkProps(link?.url);
      if (props) links.push({ id: link.id, ...props });
    }
    return links.length ? { id: tile.id, mode: 'external', links } : null;
  }

  return null;
}
