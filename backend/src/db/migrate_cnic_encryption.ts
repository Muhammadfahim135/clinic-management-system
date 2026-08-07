import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { encrypt } from '../utils/crypto';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_DATABASE || 'clinic_db',
});

async function runCnicEncryptionMigration() {
  console.log('Running CNIC Encryption migration...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Alter cnic column length
    console.log('Altering patients table: cnic length to VARCHAR(255)...');
    await client.query(`
      ALTER TABLE patients 
      ALTER COLUMN cnic TYPE VARCHAR(255);
    `);

    // 2. Fetch all patients
    console.log('Retrieving patients for CNIC encryption...');
    const patientsRes = await client.query('SELECT id, cnic FROM patients');
    
    // 3. Encrypt and update each CNIC
    for (const patient of patientsRes.rows) {
      const originalCnic = patient.cnic;
      if (!originalCnic.includes(':')) {
        console.log(`Encrypting CNIC for patient ID ${patient.id}...`);
        const encryptedCnic = encrypt(originalCnic);
        await client.query(
          'UPDATE patients SET cnic = $1 WHERE id = $2',
          [encryptedCnic, patient.id]
        );
      }
    }

    await client.query('COMMIT');
    console.log('CNIC Encryption migration completed successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('CNIC Encryption migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runCnicEncryptionMigration();
