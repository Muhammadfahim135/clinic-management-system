import pool from '../config/db';

async function seedPrescription() {
  console.log('Seeding sample active prescription...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Get Doctor's ID
    const docRes = await client.query("SELECT id FROM users WHERE email = 'doctor@clinic.com'");
    const doctorId = docRes.rows[0].id;

    // 2. Get Visit ID
    const visitRes = await client.query(`
      SELECT v.id FROM visits v
      JOIN patients p ON v.patient_id = p.id
      WHERE p.name = 'Alice Cooper'
      LIMIT 1
    `);
    const visitId = visitRes.rows[0].id;

    // 3. Insert Prescription
    const prescRes = await client.query(`
      INSERT INTO prescriptions (visit_id, instructions, prescribed_by)
      VALUES ($1, $2, $3)
      RETURNING id
    `, [
      visitId,
      'Take rest, drink warm water, avoid dust and cold drinks. Follow up next week.',
      doctorId
    ]);
    const prescriptionId = prescRes.rows[0].id;

    // 4. Insert Items
    await client.query(`
      INSERT INTO prescription_items (prescription_id, medicine_name, dosage, frequency, duration, notes)
      VALUES 
        ($1, 'Co-Amoxiclav', '625 mg', 'Twice daily', '7 Days', 'Take after meals'),
        ($1, 'Montelukast', '10 mg', 'Once daily', '14 Days', 'Take at bedtime'),
        ($1, 'Paracetamol', '500 mg', 'Three times daily', '3 Days', 'For fever or body aches')
    `, [prescriptionId]);

    await client.query('COMMIT');
    console.log(`Successfully seeded sample prescription ${prescriptionId} for visit ${visitId}.`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Failed to seed sample prescription:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

seedPrescription();
