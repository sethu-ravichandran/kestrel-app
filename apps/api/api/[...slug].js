// Vercel catch-all function: receives every /api/* request with the original URL intact.
// /scim/* is rewritten to /api/scim/* in vercel.json; strip that prefix back off.
const handler = require('../server.js');

module.exports = (req, res) => {
  const u = new URL(req.url, 'http://x');
  if (u.pathname.startsWith('/api/scim/')) u.pathname = u.pathname.slice(4);
  req.url = u.pathname + u.search;
  return handler(req, res);
};
