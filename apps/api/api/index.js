// Vercel serverless entry. Requests to /api/* and /scim/* are rewritten here; Vercel may expose the
// original path in different places, so recover it before handing off to the app.
const handler = require('../server.js');

module.exports = (req, res) => {
  const u = new URL(req.url, 'http://x');
  let p = u.pathname;
  const fromQuery = u.searchParams.get('__path') ?? u.searchParams.get('path');
  if (p === '/api' || p === '/api/' || p === '/api/index' || p === '/api/index.js') {
    if (fromQuery != null) {
      const cleaned = String(fromQuery).replace(/^\/+/, '');
      p = '/' + (/^(api|scim)\//.test(cleaned) ? cleaned : 'api/' + cleaned);
    } else if (req.headers['x-matched-path'] && req.headers['x-matched-path'] !== '/api') {
      p = req.headers['x-matched-path'];
    }
  }
  u.searchParams.delete('__path'); u.searchParams.delete('path');
  const qs = u.searchParams.toString();
  req.url = p + (qs ? '?' + qs : '');
  return handler(req, res);
};
