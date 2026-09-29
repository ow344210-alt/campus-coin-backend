const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const badRequest = (message) => {
  const err = new Error(message);
  err.statusCode = 400;
  return err;
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
    cb(null, `${uniqueSuffix}.csv`);
  },
});

const fileFilter = (req, file, cb) => {
  const isCsvExt = path.extname(file.originalname).toLowerCase() === '.csv';
  const allowedMimeTypes = [
    'text/csv',
    'application/vnd.ms-excel',
    'text/plain',
    'application/csv',
    'text/x-csv',
  ];
  const isCsvType = allowedMimeTypes.includes(file.mimetype);

  if (!isCsvExt || !isCsvType) {
    return cb(badRequest('Only CSV files are allowed'));
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
}).single('file');

const looksLikeCsv = async (filePath) => {
  return new Promise((resolve) => {
    const stream = fs.createReadStream(filePath, { start: 0, end: 512 });

    stream.on('data', (chunk) => {
      const hasNullByte = chunk.includes(0);
      const isPdf = chunk.toString('latin1', 0, 4) === '%PDF';
      stream.destroy();
      resolve(!hasNullByte && !isPdf);
    });

    stream.on('error', () => resolve(false));
  });
};

const uploadMiddleware = (req, res, next) => {
  upload(req, res, async (err) => {
    if (err) return next(err);

    if (!req.file) {
      return next(badRequest('Please upload a CSV file'));
    }

    const isValidCsv = await looksLikeCsv(req.file.path);
    if (!isValidCsv) {
      fs.unlink(req.file.path, () => {});
      return next(badRequest('File content is not a valid CSV'));
    }

    next();
  });
};

module.exports = uploadMiddleware;