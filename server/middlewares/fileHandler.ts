/**
 * Generic File Upload Middleware (TypeScript)
 * --------------------------------------------
 * Usage:
 *   uploadFile({ folder: "brands", maxSize: 1 * 1024 * 1024 })
 *   uploadFile({ folder: "products", maxSize: 2 * 1024 * 1024 })
 *
 * notes:
 * - Uses multer.diskStorage to write files to server/uploads/<folder>
 * - Ensures upload directory exists
 * - Filters file types to PNG/JPG/JPEG only
 * - Wraps multer callback errors into Express error flow via asyncHandler
 */
import multer, { FileFilterCallback } from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

/* ESM dirname/__filename helpers */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type UploadOptions = {
  folder?: string;
  maxSize?: number;
};

export const uploadFile = (
  { folder = "uploads", maxSize = 1024 * 1024 }: UploadOptions = {},
) => {
  const uploadDir = path.join(__dirname, "..", "uploads", folder);

  // Ensure upload directory exists
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: uploadDir,
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      const uniqueName = `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}${ext}`;
      cb(null, uniqueName);
    },
  });

  const fileFilter = (_req: any, file: any, cb: FileFilterCallback) => {
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg"];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error("Only PNG, JPG, JPEG files are allowed"));
    }
    cb(null, true);
  };

  const upload = multer({
    storage,
    limits: { fileSize: maxSize },
    fileFilter,
  });

  /**
   * Return middleware that expects form field name: "file"
   * English note: multer.single("file") handles parsing multipart/form-data.
   */
  return (req: any, res: any, next: any) => {
    const singleUpload = upload.single("file");
    singleUpload(req, res, (err: any) => {
      if (err) return next(err);
      return next();
    });
  };
};

export const deleteFile = (folder: string, filename?: string | null) => {
  if (!filename) return;

  const filePath = path.join(__dirname, "..", "uploads", folder, filename);

  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err: any) {
    // notes: deletion failures should not crash the request.
    console.error(`Failed to delete file ${filePath}:`, err?.message || err);
  }
};
