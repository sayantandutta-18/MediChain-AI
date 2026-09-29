import type { RequestHandler } from 'express';
import multer from 'multer';
import { ApiError } from '../utils/ApiError';
import { env } from '../config/env';

const storage = multer.memoryStorage();

/**
 * TRD-5/TRD-12: multipart upload enters memory only, is size limited, and the
 * declared mime type must be on the allow list. Nothing touches the filesystem.
 */
export const uploadSingleFile = multer({
  storage,
  limits: {
    fileSize: env.uploads.maxFileSizeBytes,
    files: 1,
    fields: 20,
  },
  fileFilter: (_req, file, cb) => {
    const allowed = env.uploads.allowedMimeTypes;
    if (!allowed.includes(file.mimetype)) {
      cb(
        ApiError.unsupportedMedia(
          `File type "${file.mimetype}" is not accepted. Allowed types: ${allowed.join(', ')}.`,
        ),
      );
      return;
    }
    cb(null, true);
  },
}).single('file');

/** Wraps multer so its errors flow through the centralised error handler. */
export const receiveMedicalFile: RequestHandler = (req, res, next) => {
  uploadSingleFile(req, res, (error) => {
    if (error) {
      next(error);
      return;
    }
    if (!req.file) {
      next(ApiError.badRequest('A medical record file is required under the "file" field.', 'FILE_REQUIRED'));
      return;
    }
    if (req.file.size === 0) {
      next(ApiError.badRequest('The uploaded file is empty.', 'FILE_EMPTY'));
      return;
    }
    next();
  });
};
