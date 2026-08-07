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

async function runPrescriptionMigrations() {
  console.log('Running Prescription Management migrations...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Create prescriptions table
    console.log('Creating "prescriptions" table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS prescriptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        visit_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
        instructions TEXT,
        prescribed_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        prescribed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        is_deleted BOOLEAN DEFAULT FALSE NOT NULL
      )
    `);

    // 2. Create prescription_items table
    console.log('Creating "prescription_items" table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS prescription_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        prescription_id UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
        medicine_name VARCHAR(255) NOT NULL,
        dosage VARCHAR(100) NOT NULL,
        frequency VARCHAR(100) NOT NULL,
        duration VARCHAR(100) NOT NULL,
        notes TEXT
      )
    `);

    // 3. Create indexes for fast searching and joining
    console.log('Creating prescription indexes...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_prescriptions_visit_id 
      ON prescriptions(visit_id)
      WHERE is_deleted = FALSE;
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_prescription_items_prescription_id 
      ON prescription_items(prescription_id);
    `);

    // 4. Create trigger to update updated_at on prescriptions
    console.log('Creating trigger for prescription updates...');
    await client.query(`
      DROP TRIGGER IF EXISTS update_prescriptions_updated_at ON prescriptions;
      CREATE TRIGGER update_prescriptions_updated_at
          BEFORE UPDATE ON prescriptions
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
    `);

    await client.query('COMMIT');
    console.log('Prescription Management migrations completed successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Prescription migration failed. Transaction rolled back:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runPrescriptionMigrations();
