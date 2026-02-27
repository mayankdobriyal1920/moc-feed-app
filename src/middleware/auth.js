function authRequired(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token || !token.startsWith('mock-')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const userId = token.slice(5).trim();
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  req.user = { userId };
  return next();
}

module.exports = { authRequired };