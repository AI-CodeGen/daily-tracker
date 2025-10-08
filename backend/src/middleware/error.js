// Generic error handler
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  console.error(err);
  if (err.isJoi) {
    return res.status(400).json({ message: err.message });
  }
  res.status(500).json({ message: 'Internal Server Error' });
}
