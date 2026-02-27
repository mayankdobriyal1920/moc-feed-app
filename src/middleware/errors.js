function notFound(req, res) {
  return res.status(404).json({ message: 'Route not found' });
}

function errorHandler(err, req, res, next) {
  if (err?.type === 'validation') {
    return res.status(400).json({ message: 'Validation error', errors: err.errors });
  }

  // Express JSON parser throws SyntaxError with status 400 for invalid JSON payloads.
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ message: 'Invalid JSON body' });
  }

  console.error(err);
  return res.status(500).json({ message: 'Internal server error' });
}

module.exports = { notFound, errorHandler };