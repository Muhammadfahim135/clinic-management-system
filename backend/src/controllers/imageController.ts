import { Response, Request } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { query } from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth';

// Define path mapping to resolve relative uploads path securely
const UPLOADS_DIR_BASE = path.join(__dirname, '../../uploads');

// Ensure base directory exists
if (!fs.existsSync(UPLOADS_DIR_BASE)) {
  fs.mkdirSync(UPLOADS_DIR_BASE, { recursive: true });
}

// 1. Configure dynamic disk storage for Multer
const storage = multer.diskStorage({
  destination: async (req: Request, file, cb) => {
    const { visitId, patientId } = req.params;
    try {
      let patientCode = '';
      let destDir = '';

      if (visitId) {
        // Query to get patient code associated with visit
        const res = await query(
          `SELECT p.patient_code 
           FROM visits v
           JOIN patients p ON v.patient_id = p.id
           WHERE v.id = $1 AND v.is_deleted = FALSE`,
          [visitId]
        );

        if ((res.rowCount ?? 0) === 0) {
          return cb(new Error('Patient visit record not found or has been deleted.'), '');
        }

        patientCode = res.rows[0].patient_code;
        // Target directory: uploads/patients/PAT-xxxxxx/visit-<UUID>/
        destDir = path.join(UPLOADS_DIR_BASE, 'patients', patientCode, `visit-${visitId}`);
      } else if (patientId) {
        // Query to get patient code directly
        const res = await query(
          `SELECT patient_code FROM patients WHERE id = $1 AND is_deleted = FALSE`,
          [patientId]
        );

        if ((res.rowCount ?? 0) === 0) {
          return cb(new Error('Patient record not found or has been deleted.'), '');
        }

        patientCode = res.rows[0].patient_code;
        // Target directory: uploads/patients/PAT-xxxxxx/general/
        destDir = path.join(UPLOADS_DIR_BASE, 'patients', patientCode, 'general');
      } else {
        return cb(new Error('No valid visitId or patientId parameters provided.'), '');
      }

      // Create recursive directories if missing
      fs.mkdirSync(destDir, { recursive: true });
      cb(null, destDir);
    } catch (err: any) {
      cb(err, '');
    }
  },
  filename: (req, file, cb) => {
    // Generate unique filename: time + random suffix + extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    const prefix = ext === '.pdf' ? 'doc' : 'img';
    cb(null, `${prefix}-${uniqueSuffix}${ext}`);
  }
});

// 2. Configure file filter rules (JPG, JPEG, PNG, WEBP)
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedExts = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedExts.includes(ext) && allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file format. Only JPG, JPEG, PNG, WEBP, and PDF formats are supported.'));
  }
};

// 3. Initialize Multer upload handler (Limit 10MB per file)
export const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB limit
  }
}).array('images', 10); // allow up to 10 files in a single batch

/**
 * Handle Visit Image uploads
 * POST /api/visits/:visitId/images
 */
export const uploadImages = async (req: AuthenticatedRequest, res: Response) => {
  const { visitId } = req.params;
  const { imageType, description } = req.body;
  const files = req.files as Express.Multer.File[];

  // 1. Validations
  if (!files || files.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No files were uploaded.',
    });
  }

  if (!imageType) {
    // Clean up uploaded files since registration failed
    files.forEach(f => fs.unlinkSync(f.path));
    return res.status(400).json({
      success: false,
      message: 'Image type category is required.',
    });
  }

  const validTypes = [
    'Treatment Photo',
    'X-ray',
    'Scan',
    'Before Treatment',
    'After Treatment',
    'Progress Photo',
    'Medical Report',
    'Lab Report',
    'Other'
  ];

  if (!validTypes.includes(imageType)) {
    files.forEach(f => fs.unlinkSync(f.path));
    return res.status(400).json({
      success: false,
      message: 'Invalid image type category.',
    });
  }

  try {
    // Get patient_id from visit
    const visitCheck = await query('SELECT patient_id FROM visits WHERE id = $1 AND is_deleted = FALSE', [visitId]);
    if ((visitCheck.rowCount ?? 0) === 0) {
      files.forEach(f => fs.unlinkSync(f.path));
      return res.status(404).json({ success: false, message: 'Visit record not found.' });
    }
    const patientId = visitCheck.rows[0].patient_id;

    const uploadedRecords = [];

    // 2. Loop files and save record paths to database
    for (const file of files) {
      // Save relative path for database portability (relative to UPLOADS_DIR_BASE)
      const relativePath = path.relative(UPLOADS_DIR_BASE, file.path);
      
      const insertRes = await query(
        `INSERT INTO visit_images (
          patient_id, visit_id, file_name, file_path, image_type, description, uploaded_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, file_name, image_type, description, created_at`,
        [
          patientId,
          visitId,
          file.filename,
          relativePath.replace(/\\/g, '/'), // enforce forward slashes for cross-platform URL compatibility
          imageType,
          description ? description.trim() : null,
          req.user?.userId,
        ]
      );
      uploadedRecords.push(insertRes.rows[0]);
    }

    return res.status(201).json({
      success: true,
      message: `${files.length} image(s) uploaded and linked successfully.`,
      images: uploadedRecords,
    });
  } catch (error) {
    console.error('uploadImages error:', error);
    // Clean up uploaded files in case of DB failure
    files.forEach(f => {
      if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
    });
    return res.status(500).json({
      success: false,
      message: 'Failed to complete file registration in patient records.',
    });
  }
};

/**
 * Handle Patient Document uploads directly
 * POST /api/patients/:patientId/files
 */
export const uploadPatientFiles = async (req: AuthenticatedRequest, res: Response) => {
  const { patientId } = req.params;
  const { imageType, description } = req.body;
  const files = req.files as Express.Multer.File[];

  // 1. Validations
  if (!files || files.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No files were uploaded.',
    });
  }

  if (!imageType) {
    files.forEach(f => fs.unlinkSync(f.path));
    return res.status(400).json({
      success: false,
      message: 'Document category type is required.',
    });
  }

  const validTypes = [
    'Treatment Photo',
    'X-ray',
    'Scan',
    'Before Treatment',
    'After Treatment',
    'Progress Photo',
    'Medical Report',
    'Lab Report',
    'Other'
  ];

  if (!validTypes.includes(imageType)) {
    files.forEach(f => fs.unlinkSync(f.path));
    return res.status(400).json({
      success: false,
      message: 'Invalid document category type.',
    });
  }

  try {
    const uploadedRecords = [];

    // 2. Loop files and save record paths to database
    for (const file of files) {
      const relativePath = path.relative(UPLOADS_DIR_BASE, file.path);
      
      const insertRes = await query(
        `INSERT INTO visit_images (
          patient_id, visit_id, file_name, file_path, image_type, description, uploaded_by
        )
        VALUES ($1, NULL, $2, $3, $4, $5, $6)
        RETURNING id, file_name, image_type, description, created_at`,
        [
          patientId,
          file.filename,
          relativePath.replace(/\\/g, '/'),
          imageType,
          description ? description.trim() : null,
          req.user?.userId,
        ]
      );
      uploadedRecords.push(insertRes.rows[0]);
    }

    return res.status(201).json({
      success: true,
      message: `${files.length} document(s) uploaded successfully.`,
      images: uploadedRecords,
    });
  } catch (error) {
    console.error('uploadPatientFiles error:', error);
    files.forEach(f => {
      if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
    });
    return res.status(500).json({
      success: false,
      message: 'Failed to complete document registration in patient records.',
    });
  }
};

/**
 * Fetch images for a specific visit
 * GET /api/visits/:visitId/images
 */
export const getVisitImages = async (req: AuthenticatedRequest, res: Response) => {
  const { visitId } = req.params;

  try {
    const imagesRes = await query(
      `SELECT vi.id, vi.visit_id, vi.file_name, vi.image_type, vi.description, vi.created_at, u.name as uploader_name
       FROM visit_images vi
       JOIN users u ON vi.uploaded_by = u.id
       WHERE vi.visit_id = $1
       ORDER BY vi.created_at DESC`,
      [visitId]
    );

    return res.status(200).json({
      success: true,
      images: imagesRes.rows,
    });
  } catch (error) {
    console.error('getVisitImages error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch visit images.',
    });
  }
};

/**
 * Fetch all patient images grouped by visit (latest visit first)
 * GET /api/patients/:patientId/images
 */
export const getPatientImages = async (req: AuthenticatedRequest, res: Response) => {
  const { patientId } = req.params;

  try {
    const imagesRes = await query(
      `SELECT vi.id, vi.visit_id, vi.file_name, vi.image_type, vi.description, vi.created_at, 
              v.visit_date, v.diagnosis, u.name as uploader_name
       FROM visit_images vi
       LEFT JOIN visits v ON vi.visit_id = v.id AND v.is_deleted = FALSE
       JOIN users u ON vi.uploaded_by = u.id
       WHERE vi.patient_id = $1
       ORDER BY COALESCE(v.visit_date, vi.created_at) DESC, vi.created_at DESC`,
      [patientId]
    );

    return res.status(200).json({
      success: true,
      images: imagesRes.rows,
    });
  } catch (error) {
    console.error('getPatientImages error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch patient gallery.',
    });
  }
};

/**
 * Update an image description
 * PUT /api/images/:imageId
 */
export const updateImageDescription = async (req: AuthenticatedRequest, res: Response) => {
  const { imageId } = req.params;
  const { description } = req.body;

  try {
    // Verify image exists
    const imageCheck = await query('SELECT id FROM visit_images WHERE id = $1', [imageId]);
    if ((imageCheck.rowCount ?? 0) === 0) {
      return res.status(404).json({ success: false, message: 'Image record not found.' });
    }

    await query(
      `UPDATE visit_images
       SET description = $1
       WHERE id = $2`,
      [description ? description.trim() : null, imageId]
    );

    return res.status(200).json({
      success: true,
      message: 'Image description updated successfully.',
    });
  } catch (error) {
    console.error('updateImageDescription error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update description.',
    });
  }
};

/**
 * Delete an image record and file
 * DELETE /api/images/:imageId
 */
export const deleteImage = async (req: AuthenticatedRequest, res: Response) => {
  const { imageId } = req.params;

  try {
    // Fetch image details
    const imageRes = await query(
      'SELECT id, file_path FROM visit_images WHERE id = $1',
      [imageId]
    );

    if ((imageRes.rowCount ?? 0) === 0) {
      return res.status(404).json({
        success: false,
        message: 'Image record not found.',
      });
    }

    const image = imageRes.rows[0];
    const absolutePath = path.join(UPLOADS_DIR_BASE, image.file_path);

    // 1. Delete DB record
    await query('DELETE FROM visit_images WHERE id = $1', [imageId]);

    // 2. Delete file from local storage
    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
    }

    return res.status(200).json({
      success: true,
      message: 'Image deleted successfully.',
    });
  } catch (error) {
    console.error('deleteImage error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete image.',
    });
  }
};

/**
 * Serve full-sized image with authentication
 * GET /api/images/serve/:imageId
 */
export const serveImage = async (req: AuthenticatedRequest, res: Response) => {
  const { imageId } = req.params;

  try {
    const imageRes = await query(
      'SELECT file_path FROM visit_images WHERE id = $1',
      [imageId]
    );

    if ((imageRes.rowCount ?? 0) === 0) {
      return res.status(404).json({
        success: false,
        message: 'Image not found.',
      });
    }

    const filePath = imageRes.rows[0].file_path;
    const absolutePath = path.join(UPLOADS_DIR_BASE, filePath);

    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({
        success: false,
        message: 'Physical image file missing on server storage.',
      });
    }

    // Serve/Stream image file back
    return res.sendFile(absolutePath);
  } catch (error) {
    console.error('serveImage error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to serve image.',
    });
  }
};
