const normalizeFirst = (value) => (Array.isArray(value) ? value[0] : value);

const pickHeader = (headers, key, fallback = '') => {
  const value = headers.get(key);
  return value && String(value).trim() ? value : fallback;
};

const normalizeHeaderValue = (value, fallback = '') => {
  const first = String(normalizeFirst(value) || '').split(',')[0].trim();
  return first || fallback;
};

export default async function handler(req, res) {
  const method = String(req.method || 'GET').toUpperCase();
  if (method !== 'GET' && method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    res.status(405).json({ detail: 'Method Not Allowed' });
    return;
  }

  const slug = String(normalizeFirst(req.query?.slug) || '').trim();
  if (!slug) {
    res.status(400).json({ detail: 'Missing slug' });
    return;
  }

  const rawVersion = String(normalizeFirst(req.query?.v) || '').trim();
  const query = /^\d+$/.test(rawVersion) ? `?v=${rawVersion}` : '';
  const backendBase = String(process.env.SHARE_PROXY_BACKEND_BASE_URL || 'https://locsang-be.vercel.app').replace(/\/+$/, '');
  const upstreamUrl = `${backendBase}/api/tips/${encodeURIComponent(slug)}/share${query}`;
  const requestProto = normalizeHeaderValue(req.headers['x-forwarded-proto'], 'https');
  const requestHost = normalizeHeaderValue(req.headers['x-forwarded-host'] || req.headers.host, 'locsang.shop');
  const publicShareUrl = `${requestProto}://${requestHost}/share/tips/${encodeURIComponent(slug)}${query}`;

  try {
    const upstream = await fetch(upstreamUrl, {
      method,
      headers: {
        'user-agent': String(req.headers['user-agent'] || 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)'),
      },
      redirect: 'follow',
    });

    res.status(upstream.status);
    res.setHeader('Share-Proxy', 'frontend-function');
    res.setHeader('Content-Type', pickHeader(upstream.headers, 'content-type', 'text/html; charset=utf-8'));
    res.setHeader('Cache-Control', pickHeader(upstream.headers, 'cache-control', 'no-store, no-cache, must-revalidate, max-age=0'));
    res.setHeader('Pragma', pickHeader(upstream.headers, 'pragma', 'no-cache'));
    res.setHeader('Expires', pickHeader(upstream.headers, 'expires', '0'));

    if (method === 'HEAD') {
      res.end();
      return;
    }

    let html = await upstream.text();
    html = html.replace(
      /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i,
      `<meta property="og:url" content="${publicShareUrl}" />`
    );
    html = html.replace(
      /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/i,
      `<link rel="canonical" href="${publicShareUrl}" />`
    );
    res.send(html);
  } catch (error) {
    res.status(502).send('Failed to fetch share metadata');
  }
}
