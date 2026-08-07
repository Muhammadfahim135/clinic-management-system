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

async function runVisitMigrations() {
  console.log('Running Visit Management migrations...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Create Visits table
    console.log('Creating "visits" table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS visits (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
        doctor_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        visit_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        chief_complaint TEXT NOT NULL,
        diagnosis TEXT NOT NULL,
        blood_pressure VARCHAR(20),
        weight_kg NUMERIC(5,2),
        temperature_f NUMERIC(4,1),
        doctor_notes TEXT,
        follow_up_date DATE,
        is_deleted BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Create index for fast timeline lookups
    console.log('Creating visit indexes...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_visits_patient_date 
      ON visits(patient_id, visit_date DESC)
      WHERE is_deleted = FALSE;
    `);

    // 3. Create trigger to update updated_at
    console.log('Creating trigger for visit updates...');
    await client.query(`
      DROP TRIGGER IF EXISTS update_visits_updated_at ON visits;
      CREATE TRIGGER update_visits_updated_at
          BEFORE UPDATE ON visits
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
    `);

    await client.query('COMMIT');
    console.log('Visit Management migrations completed successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Visit migration failed. Transaction rolled back:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runVisitMigrations();
