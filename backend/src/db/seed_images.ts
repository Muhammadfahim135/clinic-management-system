import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_DATABASE || 'clinic_db',
});

// Minimal PDF structure
const pdfBuffer = Buffer.from(
  '%PDF-1.4\n' +
  '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n' +
  '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n' +
  '3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << >> /MediaBox [0 0 612 792] /Contents 4 0 R >>\nendobj\n' +
  '4 0 obj\n<< /Length 57 >>\nstream\n' +
  'BT\n/F1 12 Tf\n72 712 Td\n(CLINICAL MEDICAL REPORT - LAB RESULTS) Tj\nET\n' +
  'endstream\nendobj\n' +
  'xref\n0 5\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\n0000000212 00000 n\n' +
  'trailer\n<< /Size 5 /Root 1 0 R >>\n' +
  'startxref\n318\n%%EOF'
);

const ARTIFACT_DIR = 'C:\\Users\\muham\\.gemini\\antigravity\\brain\\c7a36fd6-2044-4c84-b04b-7b3e433c3cbd';
const UPLOADS_DIR_BASE = path.join(__dirname, '../../uploads');

async function seedMockImages() {
  console.log('Starting Mock Medical Images & PDF Seeding...');
  const client = await pool.connect();

  try {
    // 1. Find the generated artifact file names dynamically
    if (!fs.existsSync(ARTIFACT_DIR)) {
      throw new Error(`Artifact directory not found: ${ARTIFACT_DIR}`);
    }

    const files = fs.readdirSync(ARTIFACT_DIR);
    const fractureFileName = files.find(f => f.startsWith('bone_fracture_xray') && f.endsWith('.png'));
    const kneeFileName = files.find(f => f.startsWith('knee_joint_xray') && f.endsWith('.png'));

    if (!fractureFileName || !kneeFileName) {
      throw new Error('Could not locate the generated mock bone or knee joint X-ray PNG files in the artifact folder.');
    }

    const fractureSrcPath = path.join(ARTIFACT_DIR, fractureFileName);
    const kneeSrcPath = path.join(ARTIFACT_DIR, kneeFileName);

    // 2. Fetch some visits and user IDs to link
    const visitsRes = await client.query(
      `SELECT v.id, v.patient_id, p.patient_code, v.diagnosis 
       FROM visits v 
       JOIN patients p ON v.patient_id = p.id 
       WHERE v.is_deleted = FALSE 
       ORDER BY v.created_at DESC 
       LIMIT 4`
    );

    const usersRes = await client.query(
      `SELECT u.id FROM users u 
       JOIN roles r ON u.role_id = r.id 
       WHERE r.name = 'Doctor' OR r.name = 'Admin' 
       LIMIT 1`
    );

    if (visitsRes.rowCount === 0 || usersRes.rowCount === 0) {
      console.log('No active visits or doctors found. Skipping image seeding.');
      return;
    }

    const uploaderId = usersRes.rows[0].id;
    const visits = visitsRes.rows;

    // Ensure upload base dir exists
    if (!fs.existsSync(UPLOADS_DIR_BASE)) {
      fs.mkdirSync(UPLOADS_DIR_BASE, { recursive: true });
    }

    console.log(`Seeding medical files for ${visits.length} patient visits...`);

    for (let i = 0; i < visits.length; i++) {
      const visit = visits[i];
      const destDir = path.join(UPLOADS_DIR_BASE, 'patients', visit.patient_code, `visit-${visit.id}`);
      fs.mkdirSync(destDir, { recursive: true });

      // Determine which files to seed for this visit to make it realistic
      const filesToSeed = [];

      if (i % 2 === 0) {
        // Seed Fracture X-Ray
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const fileName = `img-${uniqueSuffix}-fracture.png`;
        const destPath = path.join(destDir, fileName);
        fs.copyFileSync(fractureSrcPath, destPath);
        
        filesToSeed.push({
          fileName,
          filePath: path.relative(UPLOADS_DIR_BASE, destPath).replace(/\\/g, '/'),
          type: 'X-ray',
          description: `Radiograph of patient arm showing bone hairline alignment status - Consult context: ${visit.diagnosis}`
        });
      }

      if (i % 2 === 1 || i === 0) {
        // Seed Knee Joint Scan
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const fileName = `img-${uniqueSuffix}-knee.png`;
        const destPath = path.join(destDir, fileName);
        fs.copyFileSync(kneeSrcPath, destPath);

        filesToSeed.push({
          fileName,
          filePath: path.relative(UPLOADS_DIR_BASE, destPath).replace(/\\/g, '/'),
          type: 'Scan',
          description: `Knee joint sagittal view scan - Consult context: ${visit.diagnosis}`
        });
      }

      // Seed PDF Lab Report for all visits
      {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const fileName = `doc-${uniqueSuffix}-labreport.pdf`;
        const destPath = path.join(destDir, fileName);
        fs.writeFileSync(destPath, pdfBuffer);

        filesToSeed.push({
          fileName,
          filePath: path.relative(UPLOADS_DIR_BASE, destPath).replace(/\\/g, '/'),
          type: 'Lab Report',
          description: `Laboratory blood work and CBC analytics panel - Consult context: ${visit.diagnosis}`
        });
      }

      // Insert into database
      for (const f of filesToSeed) {
        // Clear any existing duplicates
        await client.query('DELETE FROM visit_images WHERE visit_id = $1 AND file_name = $2', [visit.id, f.fileName]);
        
        await client.query(
          `INSERT INTO visit_images (patient_id, visit_id, file_name, file_path, image_type, description, uploaded_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [visit.patient_id, visit.id, f.fileName, f.filePath, f.type, f.description, uploaderId]
        );
        console.log(`- Linked ${f.type} (${f.fileName}) to Patient: ${visit.patient_code}`);
      }
    }

    console.log('Seeding completed successfully!');
  } catch (error) {
    console.error('Seeding failed:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

seedMockImages();
