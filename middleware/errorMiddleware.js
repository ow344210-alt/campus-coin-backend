const fs = require('fs');
const multer = require('multer');

const errorMiddleware = (err, req, res, next) => {
  let status = err.statusCode || 500;
  let message = err.message || 'Something went wrong';

  if (err.name === 'ValidationError' && err.errors) {
    status = 400;
    message = Object.values(err.errors).map((e) => e.message).join(', ');
  } else if (err.name === 'JsonWebTokenError') {
    status = 401;
    message = 'Invalid token';
  } else if (err.name === 'TokenExpiredError') {
    status = 401;
    message = 'Token expired';
  } else if (err.code === 11000) {
    const fields = Object.keys(err.keyValue || {});
    status = 409;
    message = `${fields[0] || 'Field'} already exists`;
  } else if (err.name === 'CastError') {
    status = 400;
    message = `Invalid ${err.path}`;
  } else if (err instanceof multer.MulterError) {
    status = 400;
    message = err.code === 'LIMIT_FILE_SIZE' ? 'File size exceeds 2MB limit' : err.message;
  }

  if (req.file) {
    fs.unlink(req.file.path, () => {});
  }
  
  if (req.files) {
    const files = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
    files.forEach((file) => fs.unlink(file.path, () => {}));
  }

  if (status === 500 && process.env.NODE_ENV === 'production') {
    message = 'Internal server error';
  }

  const response = { success: false, message };
  if (process.env.NODE_ENV !== 'production') {
    response.stack = err.stack;
  }

  res.status(status).json(response);
};

module.exports = errorMiddleware;