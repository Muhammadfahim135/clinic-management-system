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

async function clearData() {
  console.log('Clearing all random patient and clinic transaction data...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Truncate clinical, billing and transaction tables in cascade mode
    // keeping users, roles and departments intact
    await client.query(`
      TRUNCATE TABLE 
        payments, 
        bill_items, 
        bills, 
        prescription_items, 
        prescriptions, 
        appointments, 
        visit_images,
        visits, 
        patient_contacts, 
        patients, 
        audit_logs 
      RESTART IDENTITY CASCADE
    `);

    // Reset the patient sequence ID so registration codes start from PAT-000001
    await client.query(`
      ALTER SEQUENCE patient_id_seq RESTART WITH 1
    `);

    await client.query('COMMIT');
    console.log('Database transaction data cleared successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Clearing data failed. Transaction rolled back:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

clearData();
