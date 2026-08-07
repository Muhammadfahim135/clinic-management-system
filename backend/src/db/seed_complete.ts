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

async function runCompleteSeeding() {
  console.log('=== STARTING COMPLETE MOCK DATABASE SEEDING ===');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Truncate existing tables
    console.log('Clearing existing database tables...');
    await client.query(`
      TRUNCATE TABLE 
        audit_logs, 
        payments, 
        bill_items, 
        bills, 
        prescription_items, 
        prescriptions, 
        visits, 
        appointments, 
        patient_contacts, 
        patients, 
        users, 
        departments, 
        roles 
      CASCADE;
    `);

    // 2. Reset sequences
    console.log('Resetting database sequences...');
    await client.query(`ALTER SEQUENCE IF EXISTS patient_id_seq RESTART WITH 1;`);
    await client.query(`ALTER SEQUENCE IF EXISTS bill_number_seq RESTART WITH 1;`);
    await client.query(`ALTER SEQUENCE IF EXISTS receipt_number_seq RESTART WITH 1;`);

    // 3. Seed Roles
    console.log('Seeding user roles...');
    const rolesRes = await client.query(`
      INSERT INTO roles (name, description)
      VALUES 
        ('Admin', 'System administrator with full access to manage users, roles, and view logs/reports.'),
        ('Doctor', 'Medical practitioner with access to patient profiles, clinical history, appointments, and prescriptions.'),
        ('Receptionist', 'Front desk staff with access to patient registration, scheduling, and billing.')
      RETURNING id, name
    `);

    const rolesMap: Record<string, string> = {};
    rolesRes.rows.forEach(row => {
      rolesMap[row.name] = row.id;
    });

    // 4. Seed Departments
    console.log('Seeding specialty departments...');
    const deptsRes = await client.query(`
      INSERT INTO departments (name, description)
      VALUES 
        ('General Medicine', 'Primary healthcare services, general check-ups, and common consultations.'),
        ('Cardiology', 'Heart and cardiovascular health diagnostic care and therapies.'),
        ('Pediatrics', 'Specialized medical care and immunizations for infants, kids, and adolescents.'),
        ('Orthopedics', 'Treatment for musculoskeletal system issues, fractures, and joint care.'),
        ('Gynecology', 'Women reproductive system health checks, pregnancy care, and family medicine.'),
        ('Dermatology', 'Treatment for hair, nails, and skin conditions or allergies.')
      RETURNING id, name
    `);

    const deptsMap: Record<string, string> = {};
    deptsRes.rows.forEach(row => {
      deptsMap[row.name] = row.id;
    });

    // 5. Seed Users (passwords: RolePass123! or similar)
    console.log('Hashing passwords & seeding users...');
    const adminPass = await bcrypt.hash('AdminPass123!', 10);
    const doctorPass = await bcrypt.hash('DoctorPass123!', 10);
    const recepPass = await bcrypt.hash('ReceptionistPass123!', 10);

    const usersRes = await client.query(`
      INSERT INTO users (name, email, password_hash, role_id, department_id)
      VALUES 
        ('System Admin', 'admin@clinic.com', $1, $4, NULL),
        ('Dr. Sarah Jenkins', 'doctor@clinic.com', $2, $5, $7),
        ('Dr. David Miller', 'miller@clinic.com', $2, $5, $8),
        ('Dr. Emily Taylor', 'taylor@clinic.com', $2, $5, $9),
        ('Dr. Robert Chen', 'chen@clinic.com', $2, $5, $10),
        ('John Doe', 'receptionist@clinic.com', $3, $6, NULL),
        ('Jane Smith', 'jane@clinic.com', $3, $6, NULL)
      RETURNING id, name, email
    `, [
      adminPass, 
      doctorPass, 
      recepPass, 
      rolesMap['Admin'], 
      rolesMap['Doctor'], 
      rolesMap['Receptionist'],
      deptsMap['General Medicine'],
      deptsMap['Cardiology'],
      deptsMap['Pediatrics'],
      deptsMap['Orthopedics']
    ]);

    const usersMap: Record<string, string> = {};
    usersRes.rows.forEach(row => {
      usersMap[row.email] = row.id;
    });

    // 6. Seed Patients
    console.log('Seeding patient records...');
    const patientsRes = await client.query(`
      INSERT INTO patients (name, father_name, gender, date_of_birth, age, cnic, address, blood_group, allergies, medical_history, assigned_doctor_id)
      VALUES 
        ('Alice Cooper', 'Gary Cooper', 'Female', '1990-05-15', 36, '42101-1234567-8', 'Street 12, Block 4, Karachi', 'O+', 'Penicillin', 'Mild asthma in childhood', $1),
        ('Bob Jones', 'William Jones', 'Male', '1978-11-20', 47, '37405-9876543-2', 'House 42, Sector F-8, Islamabad', 'A+', 'None', 'Hypertension diagnosed in 2022', $2),
        ('Charlie Brown', 'Arthur Brown', 'Male', '2018-04-03', 8, '37405-1111111-1', 'Apartment 3B, Gulshan, Karachi', 'B-', 'Peanuts', 'Frequent ear infections', $3),
        ('Diana Prince', 'Hippolyta Prince', 'Female', '1997-08-12', 28, '37405-2222222-2', 'Villa 9, DHA Phase 6, Lahore', 'AB-', 'Sulfa Drugs', 'None', $4),
        ('Edward Stark', 'Rickard Stark', 'Male', '1974-01-30', 52, '37405-3333333-3', 'House 1A, Winterfell Lane, Quetta', 'O-', 'Dust Mites', 'Type 2 Diabetes, controlled', $1),
        ('Fiona Gallagher', 'Frank Gallagher', 'Female', '2003-09-05', 22, '37405-4444444-4', 'Street 7, Sector G-11, Islamabad', 'B+', 'None', 'None', $1)
      RETURNING id, name, patient_code
    `, [
      usersMap['doctor@clinic.com'],
      usersMap['miller@clinic.com'],
      usersMap['taylor@clinic.com'],
      usersMap['chen@clinic.com']
    ]);

    const patientMap: Record<string, string> = {};
    patientsRes.rows.forEach(row => {
      patientMap[row.name] = row.id;
    });

    // 7. Seed Patient Contacts
    console.log('Seeding patient contacts...');
    for (const row of patientsRes.rows) {
      await client.query(`
        INSERT INTO patient_contacts (patient_id, contact_number, contact_type, is_primary)
        VALUES 
          ($1, '0300-' || floor(random() * 9000000 + 1000000)::text, 'Primary', TRUE),
          ($1, '0321-' || floor(random() * 9000000 + 1000000)::text, 'Secondary', FALSE)
      `, [row.id]);
    }

    // 8. Seed Appointments over the last 30 days and the next 7 days
    console.log('Seeding appointments history...');
    
    // Past appointments (that will link to visits)
    // Today
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Setup timestamps
    const dates = [
      todayStr,
      new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // yesterday
      new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // tomorrow+1
      new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // tomorrow+3
    ];

    const appointmentsToInsert = [
      // Alice Cooper
      { name: 'Alice Cooper', date: dates[0], time: '09:30:00', type: 'Walk-in', status: 'Checked In', notes: 'Routine checkup for bronchial cough recovery.', user: 'receptionist@clinic.com' },
      { name: 'Alice Cooper', date: dates[2], time: '10:00:00', type: 'Scheduled', status: 'Completed', notes: 'Persistent coughing fit.', user: 'receptionist@clinic.com' },
      { name: 'Alice Cooper', date: dates[4], time: '14:30:00', type: 'Scheduled', status: 'Completed', notes: 'Initial allergy consult.', user: 'receptionist@clinic.com' },
      { name: 'Alice Cooper', date: dates[8], time: '11:00:00', type: 'Scheduled', status: 'Scheduled', notes: 'Followup spirometry review.', user: 'receptionist@clinic.com' },
      { name: 'Alice Cooper', date: dates[3], time: '12:00:00', type: 'Scheduled', status: 'Cancelled', notes: 'Patient had personal commitments.', user: 'admin@clinic.com' },

      // Bob Jones
      { name: 'Bob Jones', date: dates[0], time: '11:00:00', type: 'Scheduled', status: 'Scheduled', notes: 'Chest pain review and lipid panel check.', user: 'receptionist@clinic.com' },
      { name: 'Bob Jones', date: dates[1], time: '11:30:00', type: 'Scheduled', status: 'Completed', notes: 'Hypertension check.', user: 'receptionist@clinic.com' },
      { name: 'Bob Jones', date: dates[5], time: '15:00:00', type: 'Walk-in', status: 'Completed', notes: 'High BP headache warning.', user: 'receptionist@clinic.com' },

      // Charlie Brown
      { name: 'Charlie Brown', date: dates[2], time: '09:00:00', type: 'Scheduled', status: 'Completed', notes: 'Fever and ear pain.', user: 'receptionist@clinic.com' },
      { name: 'Charlie Brown', date: dates[6], time: '16:00:00', type: 'Scheduled', status: 'Completed', notes: 'Flu-like symptoms.', user: 'receptionist@clinic.com' },
      { name: 'Charlie Brown', date: dates[1], time: '10:00:00', type: 'Scheduled', status: 'No Show', notes: 'Routine vaccination appointment.', user: 'receptionist@clinic.com' },

      // Diana Prince
      { name: 'Diana Prince', date: dates[3], time: '13:00:00', type: 'Walk-in', status: 'Completed', notes: 'Ankle twisted during gym workout.', user: 'receptionist@clinic.com' },
      { name: 'Diana Prince', date: dates[9], time: '10:30:00', type: 'Scheduled', status: 'Scheduled', notes: 'Cast removal and check.', user: 'receptionist@clinic.com' },

      // Edward Stark
      { name: 'Edward Stark', date: dates[4], time: '12:15:00', type: 'Scheduled', status: 'Completed', notes: 'Diabetes checkup, blood sugar review.', user: 'receptionist@clinic.com' },
      { name: 'Edward Stark', date: dates[7], time: '12:00:00', type: 'Scheduled', status: 'Completed', notes: 'Initial consulting check.', user: 'receptionist@clinic.com' },

      // Fiona Gallagher
      { name: 'Fiona Gallagher', date: dates[5], time: '14:00:00', type: 'Walk-in', status: 'Completed', notes: 'Skin rash on hands.', user: 'receptionist@clinic.com' }
    ];

    const apptsResMap: any[] = [];
    for (const appt of appointmentsToInsert) {
      const pId = patientMap[appt.name];
      const uId = usersMap[appt.user];
      const apptRes = await client.query(`
        INSERT INTO appointments (patient_id, appointment_date, appointment_time, appointment_type, status, notes, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, patient_id, appointment_date, status
      `, [pId, appt.date, appt.time, appt.type, appt.status, appt.notes, uId]);
      apptsResMap.push({
        name: appt.name,
        date: appt.date,
        status: appt.status,
        id: apptRes.rows[0].id
      });
    }

    // 9. Seed Visits (linked to completed appointments)
    console.log('Seeding clinical consultation visits...');
    const visitsData = [
      // Alice Cooper (Completed past appointments on dates[2], dates[4])
      {
        name: 'Alice Cooper',
        date: dates[2] + ' 10:15:00+05',
        docEmail: 'doctor@clinic.com',
        complaint: 'Persistent dry cough, mild fever, and shortness of breath for 3 days.',
        diagnosis: 'Acute Bronchitis',
        bp: '120/80',
        weight: 65.5,
        temp: 101.2,
        notes: 'Advised steam inhalation, chest physiotherapy, and avoid cold beverages. Re-evaluate in one week.',
        followUp: '2026-06-20'
      },
      {
        name: 'Alice Cooper',
        date: dates[4] + ' 14:45:00+05',
        docEmail: 'doctor@clinic.com',
        complaint: 'Runny nose, sneezing, and watery itchy eyes for 2 weeks.',
        diagnosis: 'Allergic Rhinitis',
        bp: '118/78',
        weight: 66.0,
        temp: 98.6,
        notes: 'Advised avoiding allergen exposure. Keep indoor rooms well ventilated.',
        followUp: '2026-06-30'
      },
      // Bob Jones (Completed past appointments on dates[1], dates[5])
      {
        name: 'Bob Jones',
        date: dates[1] + ' 11:45:00+05',
        docEmail: 'miller@clinic.com',
        complaint: 'Routine hypertension follow-up. Experiencing mild fatigue.',
        diagnosis: 'Essential Hypertension',
        bp: '145/92',
        weight: 88.2,
        temp: 98.4,
        notes: 'Elevated BP. Adjusted dosage of antihypertensive medication. Restrict salt intake and monitor daily.',
        followUp: '2026-06-28'
      },
      {
        name: 'Bob Jones',
        date: dates[5] + ' 15:10:00+05',
        docEmail: 'miller@clinic.com',
        complaint: 'Severe headache and mild neck stiffness.',
        diagnosis: 'Hypertensive Crisis (Mild)',
        bp: '160/100',
        weight: 89.0,
        temp: 99.0,
        notes: 'BP critically elevated. Administered emergency antihypertensive dose. Stabilized in-clinic. Advised strict rest.',
        followUp: '2026-06-12'
      },
      // Charlie Brown (Completed past appointments on dates[2], dates[6])
      {
        name: 'Charlie Brown',
        date: dates[2] + ' 09:15:00+05',
        docEmail: 'taylor@clinic.com',
        complaint: 'Pain in right ear, irritability, and fever of 102F overnight.',
        diagnosis: 'Acute Otitis Media (Right Ear)',
        bp: '100/60',
        weight: 26.4,
        temp: 102.1,
        notes: 'Eardrum bulged and red. Prescribed antibiotic ear drops and syrup. Return if pain increases.',
        followUp: '2026-06-18'
      },
      {
        name: 'Charlie Brown',
        date: dates[6] + ' 16:15:00+05',
        docEmail: 'taylor@clinic.com',
        complaint: 'High fever, body aches, shivering, and running nose for 2 days.',
        diagnosis: 'Seasonal Influenza (Flu)',
        bp: '98/58',
        weight: 25.8,
        temp: 103.0,
        notes: 'Advised complete bed rest, high hydration, and sponge bathing for temperature management.',
        followUp: '2026-05-20'
      },
      // Diana Prince (Completed on dates[3])
      {
        name: 'Diana Prince',
        date: dates[3] + ' 13:10:00+05',
        docEmail: 'chen@clinic.com',
        complaint: 'Pain, swelling, and bruising on outer right ankle after a fall.',
        diagnosis: 'Grade 2 Ankle Sprain (Lateral)',
        bp: '110/70',
        weight: 58.0,
        temp: 98.6,
        notes: 'No fracture found on X-ray. Advised R.I.C.E protocol (Rest, Ice, Compression, Elevation) and ankle support brace.',
        followUp: '2026-06-25'
      },
      // Edward Stark (Completed on dates[4], dates[7])
      {
        name: 'Edward Stark',
        date: dates[4] + ' 12:30:00+05',
        docEmail: 'doctor@clinic.com',
        complaint: 'Routine checkup for diabetes. Fasting blood sugar was 145 mg/dL.',
        diagnosis: 'Type 2 Diabetes Mellitus',
        bp: '130/82',
        weight: 84.5,
        temp: 98.2,
        notes: 'HbA1c checked (7.2%). Adjusted metformin dose. Advised strict carbohydrate restrictions and active walking.',
        followUp: '2026-07-04'
      },
      {
        name: 'Edward Stark',
        date: dates[7] + ' 12:15:00+05',
        docEmail: 'doctor@clinic.com',
        complaint: 'Fasting blood sugar monitoring and overall checkup.',
        diagnosis: 'Type 2 Diabetes Mellitus',
        bp: '132/85',
        weight: 85.0,
        temp: 98.5,
        notes: 'Initial evaluation of glucose patterns. Prescribed metformin starter pack.',
        followUp: '2026-06-03'
      },
      // Fiona Gallagher (Completed on dates[5])
      {
        name: 'Fiona Gallagher',
        date: dates[5] + ' 14:15:00+05',
        docEmail: 'doctor@clinic.com',
        complaint: 'Intense itching and reddish bumps on both hands after gardening.',
        diagnosis: 'Contact Dermatitis',
        bp: '112/72',
        weight: 52.3,
        temp: 98.7,
        notes: 'Allergic reaction. Prescribed topical steroid cream and oral antihistamine. Avoid direct contact with weeds.',
        followUp: '2026-06-15'
      }
    ];

    const visitsResMap: any[] = [];
    for (const vis of visitsData) {
      const pId = patientMap[vis.name];
      const dId = usersMap[vis.docEmail];
      const visRes = await client.query(`
        INSERT INTO visits (patient_id, doctor_id, visit_date, chief_complaint, diagnosis, blood_pressure, weight_kg, temperature_f, doctor_notes, follow_up_date)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id, patient_id, diagnosis
      `, [pId, dId, vis.date, vis.complaint, vis.diagnosis, vis.bp, vis.weight, vis.temp, vis.notes, vis.followUp]);
      
      visitsResMap.push({
        name: vis.name,
        diagnosis: vis.diagnosis,
        id: visRes.rows[0].id,
        patient_id: visRes.rows[0].patient_id
      });
    }

    // 10. Seed Prescriptions (corresponding to the visits)
    console.log('Seeding medical prescriptions...');
    const prescs = [
      {
        diagnosis: 'Acute Bronchitis',
        instr: 'Take rest, drink warm water, avoid dust and cold drinks. Follow up next week.',
        doc: 'doctor@clinic.com',
        items: [
          ['Co-Amoxiclav', '625 mg', 'Twice daily', '7 Days', 'Take after meals'],
          ['Montelukast', '10 mg', 'Once daily', '14 Days', 'Take at bedtime'],
          ['Paracetamol', '500 mg', 'Three times daily', '3 Days', 'For fever or body aches']
        ]
      },
      {
        diagnosis: 'Allergic Rhinitis',
        instr: 'Keep indoor environment free of dust. Use steam inhalation.',
        doc: 'doctor@clinic.com',
        items: [
          ['Loratadine', '10 mg', 'Once daily', '10 Days', 'Take at night'],
          ['Fluticasone Nasal Spray', '50 mcg', '1 spray in each nostril daily', '30 Days', 'Shake well before use']
        ]
      },
      {
        diagnosis: 'Essential Hypertension',
        instr: 'Reduce dietary sodium. Exercise moderately.',
        doc: 'miller@clinic.com',
        items: [
          ['Lisinopril', '10 mg', 'Once daily', '30 Days', 'Take in morning'],
          ['Amlodipine', '5 mg', 'Once daily', '30 Days', 'Take at bedtime']
        ]
      },
      {
        diagnosis: 'Hypertensive Crisis (Mild)',
        instr: 'Bed rest. Monitor BP twice daily.',
        doc: 'miller@clinic.com',
        items: [
          ['Captopril', '25 mg', 'Under tongue immediately', '1 Day', 'Emergency dose administered in clinic'],
          ['Lisinopril', '20 mg', 'Once daily', '14 Days', 'Increased maintenance dose']
        ]
      },
      {
        diagnosis: 'Acute Otitis Media (Right Ear)',
        instr: 'Complete full course of antibiotics even if pain stops.',
        doc: 'taylor@clinic.com',
        items: [
          ['Cefdinir Oral Suspension', '125 mg / 5 mL', '5 mL twice daily', '10 Days', 'Keep in cool place'],
          ['Ibuprofen Syrup', '100 mg / 5 mL', '4 mL every 6 hours', '5 Days', 'For pain and fever']
        ]
      },
      {
        diagnosis: 'Seasonal Influenza (Flu)',
        instr: 'Isolate at home. Sponge bath for fever control.',
        doc: 'taylor@clinic.com',
        items: [
          ['Oseltamivir (Tamiflu)', '75 mg', 'Twice daily', '5 Days', 'Start immediately'],
          ['Cough Syrup (Guaifenesin)', '100 mg / 5 mL', '10 mL three times daily', '5 Days', 'For chest congestion']
        ]
      },
      {
        diagnosis: 'Grade 2 Ankle Sprain (Lateral)',
        instr: 'Apply ice pack for 15 mins every 2 hours. Keep leg elevated.',
        doc: 'chen@clinic.com',
        items: [
          ['Ibuprofen', '400 mg', 'Three times daily', '7 Days', 'Take with food for pain/swelling'],
          ['Diclofenac Sodium Gel', '1%', 'Apply gently to ankle 3 times daily', '10 Days', 'Avoid open wounds']
        ]
      },
      {
        diagnosis: 'Type 2 Diabetes Mellitus',
        instr: 'Check fasting glucose daily. Avoid refined sugars.',
        doc: 'doctor@clinic.com',
        items: [
          ['Metformin', '500 mg', 'Twice daily', '90 Days', 'Take with breakfast and dinner'],
          ['Glimepiride', '2 mg', 'Once daily', '90 Days', 'Take before breakfast']
        ]
      },
      {
        diagnosis: 'Contact Dermatitis',
        instr: 'Avoid suspected soaps and garden chemicals. Pat skin dry.',
        doc: 'doctor@clinic.com',
        items: [
          ['Hydrocortisone Cream', '1%', 'Apply thin layer twice daily', '7 Days', 'Apply to affected area on hands'],
          ['Fexofenadine (Allegra)', '120 mg', 'Once daily', '7 Days', 'For itch relief']
        ]
      }
    ];

    for (const pr of prescs) {
      // Find matching visit
      const matchVis = visitsResMap.find(v => v.diagnosis === pr.diagnosis);
      if (!matchVis) continue;

      const dId = usersMap[pr.doc];
      const pRes = await client.query(`
        INSERT INTO prescriptions (visit_id, instructions, prescribed_by)
        VALUES ($1, $2, $3)
        RETURNING id
      `, [matchVis.id, pr.instr, dId]);

      const pId = pRes.rows[0].id;
      for (const item of pr.items) {
        await client.query(`
          INSERT INTO prescription_items (prescription_id, medicine_name, dosage, frequency, duration, notes)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [pId, item[0], item[1], item[2], item[3], item[4]]);
      }
    }

    // 11. Seed Billings & Invoices
    console.log('Seeding billing records...');
    
    // We want to create invoices for each of the visits
    // Some are fully paid, some partially paid, some unpaid
    const billingProfiles = [
      {
        diagnosis: 'Acute Bronchitis',
        paymentStatus: 'Paid',
        total: 3500.00,
        paid: 3500.00,
        remaining: 0.00,
        notes: 'Payment received in full. Receipt printed.',
        items: [
          ['Consultation Fee', 'General physician consult charges', 1, 1500.00, 0.00, 1500.00],
          ['CBC Blood Test', 'Complete blood count lab check', 1, 1000.00, 0.00, 1000.00],
          ['Bronchitis Medicines', 'Pack of Amoxiclav and inhaler', 1, 1000.00, 0.00, 1000.00]
        ]
      },
      {
        diagnosis: 'Allergic Rhinitis',
        paymentStatus: 'Paid',
        total: 2500.00,
        paid: 2500.00,
        remaining: 0.00,
        notes: 'Paid via Easypaisa.',
        items: [
          ['Consultation Fee', 'General physician consult charges', 1, 1500.00, 0.00, 1500.00],
          ['Allergy Medicines', 'Antihistamines and nasal spray', 1, 1000.00, 0.00, 1000.00]
        ]
      },
      {
        diagnosis: 'Essential Hypertension',
        paymentStatus: 'Partially Paid',
        total: 4200.00,
        paid: 2000.00,
        remaining: 2200.00,
        notes: 'Patient promised to clear the balance next Monday.',
        items: [
          ['Specialist Consultation Fee', 'Cardiologist consult charges', 1, 2000.00, 0.00, 2000.00],
          ['ECG Test', 'Electrocardiogram graph charges', 1, 1200.00, 0.00, 1200.00],
          ['BP Medications', 'Amlodipine and Lisinopril pack', 1, 1000.00, 0.00, 1000.00]
        ]
      },
      {
        diagnosis: 'Hypertensive Crisis (Mild)',
        paymentStatus: 'Unpaid',
        total: 5500.00,
        paid: 0.00,
        remaining: 5500.00,
        notes: 'Emergency check. Invoice sent to family email.',
        items: [
          ['Emergency Specialist Consult', 'Urgent cardiologist consult charges', 1, 3000.00, 0.00, 3000.00],
          ['Emergency In-clinic Infusion', 'Emergency medication and drip charges', 1, 1500.00, 0.00, 1500.00],
          ['Cardiac Profile Labs', 'Blood profile testing fee', 1, 1000.00, 0.00, 1000.00]
        ]
      },
      {
        diagnosis: 'Acute Otitis Media (Right Ear)',
        paymentStatus: 'Paid',
        total: 2800.00,
        paid: 2800.00,
        remaining: 0.00,
        notes: 'Paid in Cash.',
        items: [
          ['Consultation Fee', 'Pediatrician consult charges', 1, 1500.00, 0.00, 1500.00],
          ['Ear Medicines', 'Antibiotic drops and syrup', 1, 1300.00, 0.00, 1300.00]
        ]
      },
      {
        diagnosis: 'Seasonal Influenza (Flu)',
        paymentStatus: 'Paid',
        total: 2700.00,
        paid: 2700.00,
        remaining: 0.00,
        notes: 'Paid via JazzCash.',
        items: [
          ['Consultation Fee', 'Pediatrician consult charges', 1, 1500.00, 0.00, 1500.00],
          ['Flu Medicines', 'Syrup and antiviral tablets', 1, 1200.00, 0.00, 1200.00]
        ]
      },
      {
        diagnosis: 'Grade 2 Ankle Sprain (Lateral)',
        paymentStatus: 'Paid',
        total: 6500.00,
        paid: 6500.00,
        remaining: 0.00,
        notes: 'Paid via Bank Transfer.',
        items: [
          ['Specialist Consultation Fee', 'Orthopedic consult charges', 1, 2000.00, 0.00, 2000.00],
          ['Ankle X-Ray (2 Views)', 'X-Ray imaging fee', 1, 2500.00, 0.00, 2500.00],
          ['Supplies & Medicines', 'Ankle brace splint and pain killers', 1, 2000.00, 0.00, 2000.00]
        ]
      },
      {
        diagnosis: 'Type 2 Diabetes Mellitus',
        paymentStatus: 'Partially Paid',
        total: 8000.00,
        paid: 5000.00,
        remaining: 3000.00,
        notes: 'Partially settled using card.',
        items: [
          ['Consultation Fee', 'General physician consult charges', 1, 1500.00, 0.00, 1500.00],
          ['HbA1c & Blood Sugar Labs', 'Glycated hemoglobin lab profile fee', 1, 2500.00, 0.00, 2500.00],
          ['3-Month Diabetes Medicines', 'Glimepiride and Metformin stock', 1, 4000.00, 0.00, 4000.00]
        ]
      },
      {
        diagnosis: 'Contact Dermatitis',
        paymentStatus: 'Paid',
        total: 3000.00,
        paid: 3000.00,
        remaining: 0.00,
        notes: 'Paid in Cash.',
        items: [
          ['Consultation Fee', 'General physician consult charges', 1, 1500.00, 0.00, 1500.00],
          ['Dermatology Medicines', 'Topical steroids and Allegra tablets', 1, 1500.00, 0.00, 1500.00]
        ]
      }
    ];

    const billResMap: any[] = [];
    for (const bProf of billingProfiles) {
      const matchVis = visitsResMap.find(v => v.diagnosis === bProf.diagnosis);
      if (!matchVis) continue;

      const pId = matchVis.patient_id;
      const uId = usersMap['receptionist@clinic.com'];

      const billRes = await client.query(`
        INSERT INTO bills (patient_id, visit_id, total_amount, amount_paid, remaining_amount, payment_status, notes, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, bill_number, total_amount, amount_paid
      `, [pId, matchVis.id, bProf.total, bProf.paid, bProf.remaining, bProf.paymentStatus, bProf.notes, uId]);

      const billId = billRes.rows[0].id;
      billResMap.push({
        billId: billId,
        amountPaid: bProf.paid,
        status: bProf.paymentStatus
      });

      for (const item of bProf.items) {
        await client.query(`
          INSERT INTO bill_items (bill_id, item_name, description, quantity, unit_price, discount, total_amount)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [billId, item[0], item[1], item[2], item[3], item[4], item[5]]);
      }
    }

    // 12. Seed Payment transactions
    console.log('Seeding payment transactions...');
    const paymentMethods = ['Cash', 'Easypaisa', 'JazzCash', 'Bank Transfer'];
    
    for (const bRes of billResMap) {
      if (bRes.amountPaid > 0) {
        const method = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
        const ref = 'TXN-' + floorAndLpad(Math.floor(Math.random() * 1000000), 6);
        const uId = usersMap['receptionist@clinic.com'];
        
        await client.query(`
          INSERT INTO payments (bill_id, amount_paid, payment_method, transaction_reference, received_by)
          VALUES ($1, $2, $3, $4, $5)
        `, [bRes.billId, bRes.amountPaid, method, ref, uId]);
      }
    }

    // 13. Seed Audit Logs
    console.log('Seeding compliance audit trails...');
    const auditLogs = [
      { action: 'Patient Registered', performedBy: 'receptionist@clinic.com', name: 'John Doe', pName: 'Alice Cooper', details: { patient_code: 'PAT-000001' } },
      { action: 'Patient Registered', performedBy: 'receptionist@clinic.com', name: 'John Doe', pName: 'Bob Jones', details: { patient_code: 'PAT-000002' } },
      { action: 'Patient Registered', performedBy: 'receptionist@clinic.com', name: 'John Doe', pName: 'Charlie Brown', details: { patient_code: 'PAT-000003' } },
      { action: 'Patient Registered', performedBy: 'receptionist@clinic.com', name: 'John Doe', pName: 'Diana Prince', details: { patient_code: 'PAT-000004' } },
      { action: 'Patient Registered', performedBy: 'receptionist@clinic.com', name: 'John Doe', pName: 'Edward Stark', details: { patient_code: 'PAT-000005' } },
      { action: 'Patient Registered', performedBy: 'receptionist@clinic.com', name: 'John Doe', pName: 'Fiona Gallagher', details: { patient_code: 'PAT-000006' } },
      { action: 'Visit Logged', performedBy: 'doctor@clinic.com', name: 'Dr. Sarah Jenkins', pName: 'Alice Cooper', details: { diagnosis: 'Acute Bronchitis', complaint: 'Persistent dry cough' } },
      { action: 'Visit Logged', performedBy: 'miller@clinic.com', name: 'Dr. David Miller', pName: 'Bob Jones', details: { diagnosis: 'Essential Hypertension', BP: '145/92' } },
      { action: 'Visit Logged', performedBy: 'taylor@clinic.com', name: 'Dr. Emily Taylor', pName: 'Charlie Brown', details: { diagnosis: 'Acute Otitis Media (Right Ear)' } },
      { action: 'Visit Logged', performedBy: 'chen@clinic.com', name: 'Dr. Robert Chen', pName: 'Diana Prince', details: { diagnosis: 'Grade 2 Ankle Sprain' } },
      { action: 'Bill Created', performedBy: 'receptionist@clinic.com', name: 'John Doe', pName: 'Alice Cooper', details: { total_amount: 3500.00, bill_number: 'BILL-000001' } },
      { action: 'Bill Created', performedBy: 'receptionist@clinic.com', name: 'John Doe', pName: 'Bob Jones', details: { total_amount: 4200.00, bill_number: 'BILL-000003' } },
      { action: 'Payment Recorded', performedBy: 'receptionist@clinic.com', name: 'John Doe', pName: 'Alice Cooper', details: { amount_paid: 3500.00, method: 'Easypaisa' } },
      { action: 'Payment Recorded', performedBy: 'receptionist@clinic.com', name: 'John Doe', pName: 'Bob Jones', details: { amount_paid: 2000.00, method: 'Cash' } },
      { action: 'Department Created', performedBy: 'admin@clinic.com', name: 'System Admin', pName: null, details: { department: 'Dermatology' } },
      { action: 'Patient Profile Updated', performedBy: 'receptionist@clinic.com', name: 'John Doe', pName: 'Edward Stark', details: { modified_fields: ['address', 'allergies'] } }
    ];

    for (const log of auditLogs) {
      const uId = usersMap[log.performedBy];
      const pId = log.pName ? patientMap[log.pName] : null;

      await client.query(`
        INSERT INTO audit_logs (action, performed_by, performed_by_name, patient_id, details)
        VALUES ($1, $2, $3, $4, $5)
      `, [log.action, uId, log.name, pId, JSON.stringify(log.details)]);
    }

    await client.query('COMMIT');
    console.log('=== COMPLETE SEEDING COMPLETED SUCCESSFULLY ===');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Complete seeding failed. Transaction rolled back:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Helpers
function floorAndLpad(num: number, len: number): string {
  return String(num).padStart(len, '0');
}

runCompleteSeeding();
