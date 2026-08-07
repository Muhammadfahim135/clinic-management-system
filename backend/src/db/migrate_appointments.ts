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

async function runAppointmentMigrations() {
  console.log('Running Appointment Management migrations...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Create appointments table
    console.log('Creating "appointments" table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS appointments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
        appointment_date DATE NOT NULL,
        appointment_time TIME WITHOUT TIME ZONE NOT NULL,
        appointment_type VARCHAR(20) NOT NULL CHECK (appointment_type IN ('Walk-in', 'Scheduled')),
        status VARCHAR(20) NOT NULL DEFAULT 'Scheduled' CHECK (status IN ('Scheduled', 'Checked In', 'Completed', 'Cancelled', 'No Show')),
        notes TEXT,
        created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        is_deleted BOOLEAN DEFAULT FALSE NOT NULL
      )
    `);

    // 2. Create indexes for fast searching and filtering
    console.log('Creating appointment indexes...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_appointments_patient_id 
      ON appointments(patient_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_appointments_date 
      ON appointments(appointment_date);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_appointments_status 
      ON appointments(status);
    `);

    // 3. Create updated_at trigger
    console.log('Creating trigger for appointment updates...');
    await client.query(`
      DROP TRIGGER IF EXISTS update_appointments_updated_at ON appointments;
      CREATE TRIGGER update_appointments_updated_at
          BEFORE UPDATE ON appointments
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
    `);

    await client.query('COMMIT');
    console.log('Appointment Management migrations completed successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Appointment migration failed. Transaction rolled back:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runAppointmentMigrations();
