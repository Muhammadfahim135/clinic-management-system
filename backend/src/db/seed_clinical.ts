import pool from '../config/db';

async function runClinicalSeed() {
  console.log('Seeding clinical data (patients & visits)...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Get Doctor's ID
    const docRes = await client.query("SELECT id FROM users WHERE email = 'doctor@clinic.com'");
    if (docRes.rowCount === 0) {
      throw new Error('Doctor user not found. Run "npm run seed" first.');
    }
    const doctorId = docRes.rows[0].id;

    // 2. Insert Patient (Alice Cooper)
    console.log('Inserting patient...');
    const patientRes = await client.query(`
      INSERT INTO patients (name, father_name, gender, date_of_birth, age, cnic, address, blood_group, allergies, medical_history, assigned_doctor_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (cnic) DO UPDATE SET name = EXCLUDED.name
      RETURNING id, patient_code
    `, [
      'Alice Cooper', 
      'Gary Cooper', 
      'Female', 
      '1990-05-15', 
      36, 
      '42101-1234567-8', 
      'Street 12, Block 4, Karachi', 
      'O+', 
      'Penicillin', 
      'Mild asthma in childhood', 
      doctorId
    ]);

    const patientId = patientRes.rows[0].id;
    console.log(`Patient inserted: ${patientRes.rows[0].patient_code} (ID: ${patientId})`);

    // 3. Insert Patient Contact
    console.log('Inserting contact details...');
    await client.query(`
      INSERT INTO patient_contacts (patient_id, contact_number, contact_type, is_primary)
      VALUES ($1, $2, $3, $4)
    `, [patientId, '0300-1234567', 'Primary', true]);

    // 4. Insert Visit
    console.log('Inserting visit...');
    const visitRes = await client.query(`
      INSERT INTO visits (patient_id, doctor_id, chief_complaint, diagnosis, blood_pressure, weight_kg, temperature_f, doctor_notes, follow_up_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id
    `, [
      patientId,
      doctorId,
      'Persistent dry cough, mild fever, and shortness of breath for 3 days.',
      'Acute Bronchitis',
      '120/80',
      65.5,
      101.2,
      'Advised steam inhalation, chest physiotherapy, and avoid cold beverages. Re-evaluate in one week.',
      '2026-06-20'
    ]);

    const visitId = visitRes.rows[0].id;
    console.log(`Visit inserted successfully with ID: ${visitId}`);

    await client.query('COMMIT');
    console.log('Clinical seeding completed successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Clinical seeding failed. Transaction rolled back:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

runClinicalSeed();
