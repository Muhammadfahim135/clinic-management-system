import pool from '../config/db';

async function seedBilling() {
  console.log('Seeding sample billing & payments data...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Get Receptionist's ID (receiver)
    const recRes = await client.query("SELECT id FROM users WHERE email = 'receptionist@clinic.com'");
    if (recRes.rowCount === 0) {
      throw new Error('Receptionist user not found. Run "npm run seed" first.');
    }
    const receptionistId = recRes.rows[0].id;

    // 2. Get Alice Cooper's ID
    const patientRes = await client.query("SELECT id FROM patients WHERE name = 'Alice Cooper' LIMIT 1");
    if (patientRes.rowCount === 0) {
      throw new Error('Patient Alice Cooper not found. Run "npx ts-node src/db/seed_clinical.ts" first.');
    }
    const patientId = patientRes.rows[0].id;

    // 3. Get Visit ID
    const visitRes = await client.query("SELECT id FROM visits WHERE patient_id = $1 LIMIT 1", [patientId]);
    if (visitRes.rowCount === 0) {
      throw new Error('Visit for Alice Cooper not found.');
    }
    const visitId = visitRes.rows[0].id;

    // 4. Create Bill (BILL-000001)
    console.log('Inserting sample bill invoice...');
    const billRes = await client.query(`
      INSERT INTO bills (patient_id, visit_id, total_amount, amount_paid, remaining_amount, payment_status, notes, created_by)
      VALUES ($1, $2, 3200.00, 2000.00, 1200.00, 'Partially Paid', 'Patient requested split payment. Balance will be cleared next week.', $3)
      RETURNING id, bill_number
    `, [patientId, visitId, receptionistId]);
    const billId = billRes.rows[0].id;
    console.log(`Bill created: ${billRes.rows[0].bill_number} (ID: ${billId})`);

    // 5. Insert Bill Items
    console.log('Inserting bill items...');
    await client.query(`
      INSERT INTO bill_items (bill_id, item_name, description, quantity, unit_price, discount, total_amount)
      VALUES 
        ($1, 'Consultation Fee', 'Routine consultant checkup charges', 1, 1500.00, 0.00, 1500.00),
        ($1, 'Lab Report (CBC)', 'Complete Blood Count profile fee', 1, 800.00, 100.00, 700.00),
        ($1, 'Antibiotics Pack', 'Amoxicillin capsule strips', 2, 500.00, 0.00, 1000.00)
    `, [billId]);

    // 6. Insert Payment (REC-000001)
    console.log('Inserting sample payment transaction...');
    await client.query(`
      INSERT INTO payments (bill_id, amount_paid, payment_method, transaction_reference, received_by)
      VALUES ($1, 2000.00, 'Cash', 'CASH-REC-998', $2)
    `, [billId, receptionistId]);

    await client.query('COMMIT');
    console.log('Billing & Payments seeding completed successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Failed to seed billing details:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

seedBilling();
