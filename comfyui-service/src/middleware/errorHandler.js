/**
 * Error Handler Middleware
 */

export function errorHandler(err, req, res, next) {
  console.error('❌ Error:', err);

  // Default error
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error';

  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: err.errors
    });
  }

  // Queue errors
  if (err.name === 'QueueError') {
    return res.status(503).json({
      success: false,
      message: 'Queue service error',
      error: message
    });
  }

  // ComfyUI worker errors
  if (err.message && err.message.includes('No healthy ComfyUI workers')) {
    return res.status(503).json({
      success: false,
      message: 'No ComfyUI workers available',
      suggestion: 'Please try again later or contact support'
    });
  }

  // Generic error response
  res.status(status).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}

export default errorHandler;
