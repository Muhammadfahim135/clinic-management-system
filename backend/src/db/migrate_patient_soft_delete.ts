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

async function runPatientSoftDeleteMigration() {
  console.log('Running Patient Soft Delete migration...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Add is_deleted column
    console.log('Adding is_deleted column to patients table...');
    await client.query(`
      ALTER TABLE patients 
      ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE NOT NULL;
    `);

    // 2. Create index
    console.log('Creating index on patients(is_deleted)...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_patients_is_deleted 
      ON patients(is_deleted);
    `);

    await client.query('COMMIT');
    console.log('Patient Soft Delete migration completed successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Patient Soft Delete migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runPatientSoftDeleteMigration();
