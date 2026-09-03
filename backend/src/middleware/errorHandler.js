function notFound(req, res, next) {
  res.status(404);
  next(new Error(`Route not found: ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Prefer an explicit err.status (e.g. thrown by ownership helpers), then
  // whatever the controller already set on res.statusCode, then 500.
  const statusCode = err.status || (res.statusCode && res.statusCode !== 200 ? res.statusCode : 500);

  // Mongoose validation errors get a friendlier shape than "Internal server error".
  if (err.name === "ValidationError") {
    return res.status(400).json({
      error: "Validation failed",
      details: Object.fromEntries(
        Object.entries(err.errors).map(([field, e]) => [field, e.message])
      ),
    });
  }

  // Duplicate key (unique index violation)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0];
    return res.status(409).json({ error: `${field || "Field"} already in use` });
  }

  res.status(statusCode).json({
    error: err.message || "Internal server error",
    stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
  });
}

module.exports = { notFound, errorHandler };
