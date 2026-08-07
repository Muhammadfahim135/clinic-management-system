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

async function runPatientMigrations() {
  console.log('Running Patient Management migrations...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Create Patient ID Sequence
    console.log('Creating "patient_id_seq" sequence...');
    await client.query(`
      CREATE SEQUENCE IF NOT EXISTS patient_id_seq START WITH 1;
    `);

    // 2. Create Patients table
    console.log('Creating "patients" table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS patients (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        patient_code VARCHAR(20) UNIQUE NOT NULL DEFAULT ('PAT-' || lpad(nextval('patient_id_seq')::text, 6, '0')),
        name VARCHAR(100) NOT NULL,
        father_name VARCHAR(100) NOT NULL,
        gender VARCHAR(10) NOT NULL,
        date_of_birth DATE NOT NULL,
        age INTEGER NOT NULL,
        cnic VARCHAR(20) UNIQUE NOT NULL,
        address TEXT NOT NULL,
        blood_group VARCHAR(5),
        allergies TEXT,
        medical_history TEXT,
        assigned_doctor_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 3. Create indexes for fast searching
    console.log('Creating patient indexes...');
    await client.query(`CREATE INDEX IF NOT EXISTS idx_patients_code ON patients(patient_code)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(name)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_patients_cnic ON patients(cnic)`);

    // 4. Create trigger to update updated_at
    console.log('Creating trigger for patient updates...');
    await client.query(`
      DROP TRIGGER IF EXISTS update_patients_updated_at ON patients;
      CREATE TRIGGER update_patients_updated_at
          BEFORE UPDATE ON patients
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
    `);

    // 5. Create Patient Contacts table
    console.log('Creating "patient_contacts" table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS patient_contacts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
        contact_number VARCHAR(20) NOT NULL,
        contact_type VARCHAR(20) NOT NULL CHECK (contact_type IN ('Primary', 'Secondary', 'Guardian', 'Emergency')),
        is_primary BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 6. Create indexes for patient contacts
    console.log('Creating contact indexes...');
    await client.query(`CREATE INDEX IF NOT EXISTS idx_contacts_number ON patient_contacts(contact_number)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_contacts_patient_id ON patient_contacts(patient_id)`);

    await client.query('COMMIT');
    console.log('Patient Management migrations completed successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Patient migration failed. Transaction rolled back:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runPatientMigrations();
