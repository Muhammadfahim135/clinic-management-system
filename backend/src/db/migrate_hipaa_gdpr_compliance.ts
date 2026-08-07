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
  console.log('Running HIPAA & GDPR Compliance migration...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Add consent columns to patients table
    console.log('Adding consent columns to "patients" table...');
    await client.query(`
      ALTER TABLE patients 
      ADD COLUMN IF NOT EXISTS consent_given BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS consent_timestamp TIMESTAMP DEFAULT NULL
    `);

    // 2. Set existing patients consent to true (pre-existing historical consent)
    console.log('Updating historical consent for existing patients...');
    await client.query(`
      UPDATE patients
      SET consent_given = TRUE, consent_timestamp = created_at
      WHERE consent_given = FALSE OR consent_given IS NULL
    `);

    await client.query('COMMIT');
    console.log('HIPAA & GDPR Compliance migration completed successfully.');
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
