function errorHandler(err, _req, res, _next) {
  const status = err.status || err.statusCode || (err.name === 'MulterError' ? 400 : 500);
  const message = err.message || 'Internal server error';
  if (status >= 500) {
    console.error('[api]', err);
  }
  res.status(status).json({ error: message });
}

function notFound(_req, res) {
  res.status(404).json({ error: 'Not found' });
}

module.exports = { errorHandler, notFound };
