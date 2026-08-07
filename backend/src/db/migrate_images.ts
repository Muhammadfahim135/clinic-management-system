import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_DATABASE || 'clinic_db',
});

async function runImageMigrations() {
  console.log('Running Image Management migrations...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Create visit_images table
    console.log('Creating "visit_images" table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS visit_images (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        visit_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
        file_name VARCHAR(255) NOT NULL,
        file_path TEXT NOT NULL,
        image_type VARCHAR(50) NOT NULL,
        description TEXT,
        uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Create index on visit_id
    console.log('Creating visit_images indexes...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_visit_images_visit_id 
      ON visit_images(visit_id);
    `);

    await client.query('COMMIT');
    console.log('Image Management migrations completed successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Image migration failed. Transaction rolled back:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runImageMigrations();
