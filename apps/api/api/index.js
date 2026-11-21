// Vercel serverless entry. vercel.json rewrites every non-static request here and passes
// the original path as ?__path=..., so we restore req.url before handing off to the app.
const handler = require('../server.js');

module.exports = (req, res) => {
  const u = new URL(req.url, 'http://x');
  const original = u.searchParams.get('__path');
  if (original != null) {
    u.searchParams.delete('__path');
    const qs = u.searchParams.toString();
    req.url = '/' + original.replace(/^\/+/, '') + (qs ? '?' + qs : '');
  }
  return handler(req, res);
};
