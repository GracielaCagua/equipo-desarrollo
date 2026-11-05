export function errorHandler(error, _req, res, _next) {
  console.error(error);
  const status = Number.isInteger(error.status) ? error.status : 500;
  const message = status === 500 ? 'Error interno del servidor' : error.message;
  res.status(status).json({ error: message });
}

