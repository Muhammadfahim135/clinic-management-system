import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
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

async function runSeed() {
  console.log('Seeding database...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Seed Roles
    console.log('Inserting roles...');
    const rolesRes = await client.query(`
      INSERT INTO roles (name, description)
      VALUES 
        ('Admin', 'System administrator with full access to manage users, roles, and view basic logs/reports.'),
        ('Doctor', 'Medical practitioner with access to patient profiles, clinical history, appointments, and prescriptions.'),
        ('Receptionist', 'Front desk staff with access to patient registration, scheduling, and billing.')
      ON CONFLICT (name) 
      DO UPDATE SET description = EXCLUDED.description
      RETURNING id, name
    `);

    const rolesMap: Record<string, string> = {};
    rolesRes.rows.forEach(row => {
      rolesMap[row.name] = row.id;
    });

    console.log('Roles seeded:', Object.keys(rolesMap));

    // 2. Hash Passwords
    console.log('Hashing passwords...');
    const adminPasswordHash = await bcrypt.hash('AdminPass123!', 10);
    const doctorPasswordHash = await bcrypt.hash('DoctorPass123!', 10);
    const receptionistPasswordHash = await bcrypt.hash('ReceptionistPass123!', 10);

    // 3. Seed Users
    console.log('Inserting default users...');
    
    // Admin
    await client.query(`
      INSERT INTO users (name, email, password_hash, role_id)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (email) DO UPDATE 
      SET password_hash = EXCLUDED.password_hash, name = EXCLUDED.name, role_id = EXCLUDED.role_id
    `, ['System Admin', 'admin@clinic.com', adminPasswordHash, rolesMap['Admin']]);

    // Doctor
    await client.query(`
      INSERT INTO users (name, email, password_hash, role_id)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (email) DO UPDATE 
      SET password_hash = EXCLUDED.password_hash, name = EXCLUDED.name, role_id = EXCLUDED.role_id
    `, ['Dr. Sarah Jenkins', 'doctor@clinic.com', doctorPasswordHash, rolesMap['Doctor']]);

    // Receptionist
    await client.query(`
      INSERT INTO users (name, email, password_hash, role_id)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (email) DO UPDATE 
      SET password_hash = EXCLUDED.password_hash, name = EXCLUDED.name, role_id = EXCLUDED.role_id
    `, ['John Doe', 'receptionist@clinic.com', receptionistPasswordHash, rolesMap['Receptionist']]);

    await client.query('COMMIT');
    console.log('Seeding completed successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Seeding failed. Transaction rolled back:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runSeed();
