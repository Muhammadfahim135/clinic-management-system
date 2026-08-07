import { Response } from 'express';
import pool, { query } from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth';
import { logAuditAction } from '../utils/audit';
import { encrypt, decrypt } from '../utils/crypto';

interface ContactInput {
  contactNumber: string;
  contactType: 'Primary' | 'Secondary' | 'Guardian' | 'Emergency';
  isPrimary: boolean;
}

/**
 * Helper to check if a user ID is a valid doctor
 */
async function isValidDoctor(doctorId: string): Promise<boolean> {
  try {
    const res = await query(
      `SELECT u.id 
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = $1 AND r.name = 'Doctor' AND u.is_active = TRUE`,
      [doctorId]
    );
    return (res.rowCount ?? 0) > 0;
  } catch (error) {
    return false;
  }
}

/**
 * Register a new patient
 * POST /api/patients
 */
export const registerPatient = async (req: AuthenticatedRequest, res: Response) => {
  const {
    name,
    fatherName,
    gender,
    dateOfBirth,
    age,
    cnic,
    address,
    bloodGroup,
    allergies,
    medicalHistory,
    assignedDoctorId,
    contacts, // Array of ContactInput
    consentGiven,
  } = req.body;

  // 1. Basic Validations
  if (!name || !fatherName || !gender || !dateOfBirth || !age || !cnic || !address || !assignedDoctorId) {
    return res.status(400).json({
      success: false,
      message: 'Name, Father Name, Gender, Date of Birth, Age, CNIC, Address, and Assigned Doctor are required.',
    });
  }

  if (consentGiven !== true) {
    return res.status(400).json({
      success: false,
      message: 'Explicit patient consent is required to register and store clinical data under GDPR & HIPAA regulations.',
    });
  }

  if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'At least one contact number is required for registration.',
    });
  }

  // 2. Validate Doctor
  const doctorOk = await isValidDoctor(assignedDoctorId);
  if (!doctorOk) {
    return res.status(400).json({
      success: false,
      message: 'Invalid doctor assignment. The assigned doctor must exist, be active, and hold the Doctor role.',
    });
  }

  // 3. Validate Contacts structure (Exactly one primary contact)
  let primaryCount = 0;
  for (const c of contacts) {
    if (!c.contactNumber || !c.contactType) {
      return res.status(400).json({
        success: false,
        message: 'Each contact must have a contact number and contact type.',
      });
    }
    const validTypes = ['Primary', 'Secondary', 'Guardian', 'Emergency'];
    if (!validTypes.includes(c.contactType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid contact type. Must be Primary, Secondary, Guardian, or Emergency.',
      });
    }
    if (c.isPrimary) primaryCount++;
  }

  if (primaryCount !== 1) {
    return res.status(400).json({
      success: false,
      message: 'Exactly one contact number must be designated as the Primary contact.',
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 4. Check CNIC duplicate
    const cnicCheck = await client.query(
      'SELECT id, cnic FROM patients WHERE is_deleted = FALSE'
    );
    const duplicate = cnicCheck.rows.some(p => decrypt(p.cnic) === cnic.trim());
    if (duplicate) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'A patient with this CNIC is already registered.',
      });
    }

    // 5. Insert Patient
    const patientInsertRes = await client.query(
      `INSERT INTO patients (
        name, father_name, gender, date_of_birth, age, cnic, address, 
        blood_group, allergies, medical_history, assigned_doctor_id,
        consent_given, consent_timestamp
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id, patient_code, name, created_at`,
      [
        name.trim(),
        fatherName.trim(),
        gender.trim(),
        dateOfBirth,
        parseInt(age),
        encrypt(cnic.trim()),
        address.trim(),
        bloodGroup ? bloodGroup.trim() : null,
        allergies ? allergies.trim() : null,
        medicalHistory ? medicalHistory.trim() : null,
        assignedDoctorId,
        true,
        new Date()
      ]
    );

    const newPatient = patientInsertRes.rows[0];

    // 6. Insert Patient Contacts
    for (const c of contacts) {
      await client.query(
        `INSERT INTO patient_contacts (patient_id, contact_number, contact_type, is_primary)
         VALUES ($1, $2, $3, $4)`,
        [newPatient.id, c.contactNumber.trim(), c.contactType, c.isPrimary === true]
      );
    }

    await client.query('COMMIT');

    if (req.user) {
      await logAuditAction(req.user.userId, req.user.name, 'Patient Registered', newPatient.id, { patient_code: newPatient.patient_code });
    }

    return res.status(201).json({
      success: true,
      message: 'Patient registered successfully.',
      patient: newPatient,
    });
  } catch (error: any) {
    try {
      await client.query('ROLLBACK');
    } catch (e) {
      // Ignored if transaction already closed
    }
    console.error('registerPatient error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to register patient due to server error.',
    });
  } finally {
    client.release();
  }
};

/**
 * Update an existing patient's details
 * PUT /api/patients/:id
 */
export const updatePatient = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const {
    name,
    fatherName,
    gender,
    dateOfBirth,
    age,
    cnic,
    address,
    bloodGroup,
    allergies,
    medicalHistory,
    assignedDoctorId,
    consentGiven,
  } = req.body;

  // 1. Basic validation
  if (!name || !fatherName || !gender || !dateOfBirth || !age || !cnic || !address || !assignedDoctorId) {
    return res.status(400).json({
      success: false,
      message: 'Name, Father Name, Gender, Date of Birth, Age, CNIC, Address, and Assigned Doctor are required.',
    });
  }

  try {
    // 2. Verify patient exists
    const patientCheck = await query('SELECT id, consent_given, consent_timestamp FROM patients WHERE id = $1', [id]);
    if ((patientCheck.rowCount ?? 0) === 0) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found.',
      });
    }

    // 3. Verify Doctor is valid
    const doctorOk = await isValidDoctor(assignedDoctorId);
    if (!doctorOk) {
      return res.status(400).json({
        success: false,
        message: 'Invalid doctor assignment.',
      });
    }

    // 4. Verify CNIC is not taken by another patient
    const cnicCheck = await query(
      'SELECT id, cnic FROM patients WHERE id <> $1 AND is_deleted = FALSE',
      [id]
    );
    const duplicate = cnicCheck.rows.some(p => decrypt(p.cnic) === cnic.trim());
    if (duplicate) {
      return res.status(400).json({
        success: false,
        message: 'A patient with this CNIC is already registered.',
      });
    }

    const currentPatient = patientCheck.rows[0];
    const newConsentTimestamp = (consentGiven && !currentPatient.consent_given) ? new Date() : currentPatient.consent_timestamp;

    // 5. Execute Update
    await query(
      `UPDATE patients
       SET name = $1, father_name = $2, gender = $3, date_of_birth = $4, age = $5,
           cnic = $6, address = $7, blood_group = $8, allergies = $9, 
           medical_history = $10, assigned_doctor_id = $11,
           consent_given = $12, consent_timestamp = $13
       WHERE id = $14`,
      [
        name.trim(),
        fatherName.trim(),
        gender.trim(),
        dateOfBirth,
        parseInt(age),
        encrypt(cnic.trim()),
        address.trim(),
        bloodGroup ? bloodGroup.trim() : null,
        allergies ? allergies.trim() : null,
        medicalHistory ? medicalHistory.trim() : null,
        assignedDoctorId,
        consentGiven === true,
        newConsentTimestamp,
        id,
      ]
    );

    if (req.user) {
      await logAuditAction(req.user.userId, req.user.name, 'Patient Profile Updated', id);
    }

    return res.status(200).json({
      success: true,
      message: 'Patient profile updated successfully.',
    });
  } catch (error) {
    console.error('updatePatient error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update patient details.',
    });
  }
};

/**
 * Search patients by multiple criteria
 * GET /api/patients
 */
export const searchPatients = async (req: AuthenticatedRequest, res: Response) => {
  const searchStr = req.query.query ? String(req.query.query).trim() : '';

  try {
    // 1. Fetch all active (non-deleted) patients
    const patientsRes = await query(
      `SELECT p.id, p.patient_code, p.name, p.father_name, p.gender, p.age, p.cnic, p.created_at, u.name as doctor_name
       FROM patients p
       JOIN users u ON p.assigned_doctor_id = u.id
       WHERE p.is_deleted = FALSE
       ORDER BY p.created_at DESC`
    );

    // 2. Decrypt all patient CNICs
    let patientRows = patientsRes.rows.map(p => ({
      ...p,
      cnic: decrypt(p.cnic)
    }));

    // 3. If query searchStr is provided, filter in memory
    if (searchStr) {
      const contactsRes = await query('SELECT patient_id, contact_number FROM patient_contacts');
      const contactsMap: Record<string, string[]> = {};
      contactsRes.rows.forEach(c => {
        if (!contactsMap[c.patient_id]) {
          contactsMap[c.patient_id] = [];
        }
        contactsMap[c.patient_id].push(c.contact_number);
      });

      const queryLower = searchStr.toLowerCase();
      patientRows = patientRows.filter(p => {
        const patientContacts = contactsMap[p.id] || [];
        return (
          p.patient_code.toLowerCase().includes(queryLower) ||
          p.name.toLowerCase().includes(queryLower) ||
          p.cnic.toLowerCase().includes(queryLower) ||
          patientContacts.some(num => num.includes(queryLower))
        );
      });
    }

    return res.status(200).json({
      success: true,
      patients: patientRows.slice(0, 50),
    });
  } catch (error) {
    console.error('searchPatients error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to search patients.',
    });
  }
};

/**
 * Get detailed patient profile
 * GET /api/patients/:id
 */
export const getPatientDetails = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    // 1. Fetch Patient details
    const patientRes = await query(
      `SELECT p.*, u.name as doctor_name
       FROM patients p
       JOIN users u ON p.assigned_doctor_id = u.id
       WHERE p.id = $1 AND p.is_deleted = FALSE`,
      [id]
    );

    if ((patientRes.rowCount ?? 0) === 0) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found.',
      });
    }

    // 2. Fetch contacts
    const contactsRes = await query(
      `SELECT id, contact_number, contact_type, is_primary
       FROM patient_contacts
       WHERE patient_id = $1
       ORDER BY is_primary DESC, created_at ASC`,
      [id]
    );

    const patient = patientRes.rows[0];
    patient.cnic = decrypt(patient.cnic);

    if (req.user) {
      await logAuditAction(req.user.userId, req.user.name, 'Patient Profile Accessed', id, { patient_code: patient.patient_code });
    }

    return res.status(200).json({
      success: true,
      patient: {
        ...patient,
        contacts: contactsRes.rows,
      },
    });
  } catch (error) {
    console.error('getPatientDetails error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve patient profile.',
    });
  }
};

/**
 * Add a contact number for a patient
 * POST /api/patients/:id/contacts
 */
export const addPatientContact = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { contactNumber, contactType, isPrimary } = req.body;

  if (!contactNumber || !contactType) {
    return res.status(400).json({
      success: false,
      message: 'Contact number and type are required.',
    });
  }

  const validTypes = ['Primary', 'Secondary', 'Guardian', 'Emergency'];
  if (!validTypes.includes(contactType)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid contact type.',
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verify patient exists
    const patientCheck = await client.query('SELECT id FROM patients WHERE id = $1', [id]);
    if ((patientCheck.rowCount ?? 0) === 0) {
      client.release();
      return res.status(404).json({ success: false, message: 'Patient not found.' });
    }

    // If making this primary, unset existing primary contacts
    if (isPrimary === true) {
      await client.query(
        'UPDATE patient_contacts SET is_primary = FALSE WHERE patient_id = $1',
        [id]
      );
    }

    // Insert new contact
    const contactInsert = await client.query(
      `INSERT INTO patient_contacts (patient_id, contact_number, contact_type, is_primary)
       VALUES ($1, $2, $3, $4)
       RETURNING id, contact_number, contact_type, is_primary`,
      [id, contactNumber.trim(), contactType, isPrimary === true]
    );

    await client.query('COMMIT');
    client.release();

    return res.status(201).json({
      success: true,
      message: 'Patient contact added successfully.',
      contact: contactInsert.rows[0],
    });
  } catch (error) {
    await client.query('ROLLBACK');
    client.release();
    console.error('addPatientContact error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to add patient contact number.',
    });
  }
};

/**
 * Update a patient contact number
 * PUT /api/patients/:id/contacts/:contactId
 */
export const updatePatientContact = async (req: AuthenticatedRequest, res: Response) => {
  const { id, contactId } = req.params;
  const { contactNumber, contactType, isPrimary } = req.body;

  if (!contactNumber || !contactType) {
    return res.status(400).json({
      success: false,
      message: 'Contact number and type are required.',
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verify contact exists and belongs to the patient
    const contactCheck = await client.query(
      'SELECT id, is_primary FROM patient_contacts WHERE id = $1 AND patient_id = $2',
      [contactId, id]
    );
    if ((contactCheck.rowCount ?? 0) === 0) {
      client.release();
      return res.status(404).json({ success: false, message: 'Patient contact not found.' });
    }

    const currentContact = contactCheck.rows[0];

    // If checking primary, unset others. If unchecking primary, verify there is at least one other primary or default it
    if (isPrimary === true) {
      await client.query(
        'UPDATE patient_contacts SET is_primary = FALSE WHERE patient_id = $1',
        [id]
      );
    } else if (isPrimary === false && currentContact.is_primary === true) {
      // Ensure we don't end up with zero primary contacts
      const primaryCount = await client.query(
        'SELECT count(id) FROM patient_contacts WHERE patient_id = $1 AND is_primary = TRUE AND id <> $2',
        [id, contactId]
      );
      if (parseInt(primaryCount.rows[0].count) === 0) {
        client.release();
        return res.status(400).json({
          success: false,
          message: 'Cannot demote the primary contact. A patient must have at least one Primary contact number.',
        });
      }
    }

    // Update
    const contactUpdate = await client.query(
      `UPDATE patient_contacts 
       SET contact_number = $1, contact_type = $2, is_primary = $3
       WHERE id = $4
       RETURNING id, contact_number, contact_type, is_primary`,
      [contactNumber.trim(), contactType, isPrimary === true, contactId]
    );

    await client.query('COMMIT');
    client.release();

    return res.status(200).json({
      success: true,
      message: 'Patient contact updated successfully.',
      contact: contactUpdate.rows[0],
    });
  } catch (error) {
    await client.query('ROLLBACK');
    client.release();
    console.error('updatePatientContact error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update patient contact number.',
    });
  }
};

/**
 * Delete a patient contact number
 * DELETE /api/patients/:id/contacts/:contactId
 */
export const deletePatientContact = async (req: AuthenticatedRequest, res: Response) => {
  const { id, contactId } = req.params;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Verify contact exists
    const contactCheck = await client.query(
      'SELECT id, is_primary FROM patient_contacts WHERE id = $1 AND patient_id = $2',
      [contactId, id]
    );
    if ((contactCheck.rowCount ?? 0) === 0) {
      client.release();
      return res.status(404).json({ success: false, message: 'Patient contact not found.' });
    }

    const contactToDelete = contactCheck.rows[0];

    // 2. Count contacts remaining
    const totalContacts = await client.query(
      'SELECT count(id) FROM patient_contacts WHERE patient_id = $1',
      [id]
    );
    if (parseInt(totalContacts.rows[0].count) <= 1) {
      client.release();
      return res.status(400).json({
        success: false,
        message: 'Cannot delete contact. A patient must have at least one contact number associated.',
      });
    }

    // 3. If deleting the primary, auto-assign primary to another contact first
    if (contactToDelete.is_primary) {
      const otherContact = await client.query(
        'SELECT id FROM patient_contacts WHERE patient_id = $1 AND id <> $2 LIMIT 1',
        [id, contactId]
      );
      if ((otherContact.rowCount ?? 0) > 0) {
        await client.query(
          'UPDATE patient_contacts SET is_primary = TRUE WHERE id = $1',
          [otherContact.rows[0].id]
        );
      }
    }

    // 4. Delete
    await client.query('DELETE FROM patient_contacts WHERE id = $1', [contactId]);

    await client.query('COMMIT');
    client.release();

    return res.status(200).json({
      success: true,
      message: 'Patient contact deleted successfully.',
    });
  } catch (error) {
    await client.query('ROLLBACK');
    client.release();
    console.error('deletePatientContact error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete contact number.',
    });
  }
};

/**
 * Soft delete a patient record (Admin only)
 * DELETE /api/patients/:id
 */
export const deletePatient = async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    const patientCheck = await query('SELECT id, name, patient_code FROM patients WHERE id = $1 AND is_deleted = FALSE', [id]);
    if ((patientCheck.rowCount ?? 0) === 0) {
      return res.status(404).json({
        success: false,
        message: 'Patient record not found.',
      });
    }

    const patient = patientCheck.rows[0];

    // Execute soft delete
    await query('UPDATE patients SET is_deleted = TRUE WHERE id = $1', [id]);

    if (req.user) {
      await logAuditAction(req.user.userId, req.user.name, 'Patient Deleted', id, { patient_code: patient.patient_code, name: patient.name });
    }

    return res.status(200).json({
      success: true,
      message: `Patient "${patient.name}" record deleted successfully.`,
    });
  } catch (error) {
    console.error('deletePatient error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete patient record.',
    });
  }
};
