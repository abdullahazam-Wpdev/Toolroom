// Used at build and request time; never infer the canonical host from request headers.
export function siteOrigin(env: Record<string, string | undefined>) {
  const raw = env.NEXT_PUBLIC_SITE_URL || (env.VERCEL_ENV === 'production' ? 'https://toolroom-woad.vercel.app' : 'http://localhost:3000');
  const url = new URL(raw);
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('NEXT_PUBLIC_SITE_URL must be an HTTP(S) origin without a path, query or credentials.');
  if (env.VERCEL_ENV === 'production' && (url.protocol !== 'https:' || ['localhost','127.0.0.1','[::1]'].includes(url.hostname))) throw new Error('Production NEXT_PUBLIC_SITE_URL must be a public HTTPS origin.');
  return url.origin;
}
