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

async function runEnhancementMigrations() {
  console.log('Running Enhancement migrations...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Create Departments table
    console.log('Creating "departments" table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS departments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Alter users table to add department_id
    console.log('Altering "users" table to add "department_id"...');
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id) ON DELETE SET NULL;
    `);

    // 3. Create index for user department_id
    console.log('Creating index on users(department_id)...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_department ON users(department_id);
    `);

    // 4. Create Audit Logs table
    console.log('Creating "audit_logs" table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        action VARCHAR(100) NOT NULL,
        performed_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        performed_by_name VARCHAR(100) NOT NULL,
        patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
        details JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 5. Create indexes for audit logs
    console.log('Creating audit logs indexes...');
    await client.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_performed_by ON audit_logs(performed_by)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_patient_id ON audit_logs(patient_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC)`);

    // 6. Seed default departments
    console.log('Seeding default departments...');
    const depts = [
      ['General Medicine', 'Primary healthcare services, general check-ups, and common consultations.'],
      ['Cardiology', 'Heart and cardiovascular health diagnostic care and therapies.'],
      ['Pediatrics', 'Specialized medical care and immunizations for infants, kids, and adolescents.'],
      ['Orthopedics', 'Treatment for musculoskeletal system issues, fractures, and joint care.'],
      ['Gynecology', 'Women reproductive system health checks, pregnancy care, and family medicine.'],
      ['Dermatology', 'Treatment for hair, nails, and skin conditions or allergies.']
    ];

    for (const [name, desc] of depts) {
      await client.query(`
        INSERT INTO departments (name, description) 
        VALUES ($1, $2) 
        ON CONFLICT (name) DO NOTHING
      `, [name, desc]);
    }

    // 7. Associate default seeded doctor with General Medicine department
    console.log('Associating default Doctor with General Medicine department...');
    const deptRes = await client.query("SELECT id FROM departments WHERE name = 'General Medicine'");
    if (deptRes.rowCount && deptRes.rowCount > 0) {
      const deptId = deptRes.rows[0].id;
      await client.query("UPDATE users SET department_id = $1 WHERE email = 'doctor@clinic.com'", [deptId]);
    }

    await client.query('COMMIT');
    console.log('Enhancement migrations completed successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Enhancement migration failed. Transaction rolled back:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runEnhancementMigrations();
