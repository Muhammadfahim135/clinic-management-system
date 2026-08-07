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

async function runMigration() {
  console.log('Running Patient-Level Documents migration...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Add patient_id column
    console.log('Adding "patient_id" column to "visit_images" table...');
    await client.query(`
      ALTER TABLE visit_images 
      ADD COLUMN IF NOT EXISTS patient_id UUID REFERENCES patients(id) ON DELETE CASCADE
    `);

    // 2. Populate patient_id for existing records based on visit_id
    console.log('Populating patient_id for existing clinical records...');
    await client.query(`
      UPDATE visit_images vi
      SET patient_id = v.patient_id
      FROM visits v
      WHERE vi.visit_id = v.id AND vi.patient_id IS NULL
    `);

    // 3. To make it safe in case of any orphaned files, let's delete any records where patient_id is still null
    await client.query(`
      DELETE FROM visit_images WHERE patient_id IS NULL
    `);

    // 4. Set patient_id column to NOT NULL
    console.log('Setting "patient_id" to NOT NULL...');
    await client.query(`
      ALTER TABLE visit_images 
      ALTER COLUMN patient_id SET NOT NULL
    `);

    // 5. Drop NOT NULL constraint on visit_id to allow patient-level files
    console.log('Altering "visit_id" to be NULLABLE...');
    await client.query(`
      ALTER TABLE visit_images 
      ALTER COLUMN visit_id DROP NOT NULL
    `);

    // 6. Create index on patient_id for quick gallery queries
    console.log('Creating index on patient_id...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_visit_images_patient_id 
      ON visit_images(patient_id)
    `);

    await client.query('COMMIT');
    console.log('Patient-Level Documents migration completed successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed. Transaction rolled back:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
