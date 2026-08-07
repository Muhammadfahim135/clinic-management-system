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

async function runBillingMigrations() {
  console.log('Running Billing Management migrations...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Create Sequences for Bill Numbers and Receipt Numbers
    console.log('Creating sequences...');
    await client.query(`
      CREATE SEQUENCE IF NOT EXISTS bill_number_seq START WITH 1;
      CREATE SEQUENCE IF NOT EXISTS receipt_number_seq START WITH 1;
    `);

    // 2. Create bills table
    console.log('Creating "bills" table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS bills (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        bill_number VARCHAR(20) UNIQUE NOT NULL DEFAULT ('BILL-' || lpad(nextval('bill_number_seq')::text, 6, '0')),
        patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
        visit_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
        total_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (total_amount >= 0),
        amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (amount_paid >= 0),
        remaining_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (remaining_amount >= 0),
        payment_status VARCHAR(20) NOT NULL DEFAULT 'Unpaid' CHECK (payment_status IN ('Unpaid', 'Partially Paid', 'Paid')),
        notes TEXT,
        created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        is_deleted BOOLEAN DEFAULT FALSE NOT NULL
      )
    `);

    // 3. Create bill_items table
    console.log('Creating "bill_items" table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS bill_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
        item_name VARCHAR(255) NOT NULL,
        description TEXT,
        quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
        unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
        discount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (discount >= 0),
        total_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (total_amount >= 0)
      )
    `);

    // 4. Create payments table
    console.log('Creating "payments" table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        receipt_number VARCHAR(20) UNIQUE NOT NULL DEFAULT ('REC-' || lpad(nextval('receipt_number_seq')::text, 6, '0')),
        bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
        amount_paid NUMERIC(12,2) NOT NULL CHECK (amount_paid > 0),
        payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('Cash', 'Easypaisa', 'JazzCash', 'Bank Transfer')),
        transaction_reference VARCHAR(100),
        payment_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        received_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 5. Create performance indexes
    console.log('Creating indexes for faster search...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_bills_patient_id ON bills(patient_id) WHERE is_deleted = FALSE;
      CREATE INDEX IF NOT EXISTS idx_bills_visit_id ON bills(visit_id) WHERE is_deleted = FALSE;
      CREATE INDEX IF NOT EXISTS idx_bill_items_bill_id ON bill_items(bill_id);
      CREATE INDEX IF NOT EXISTS idx_payments_bill_id ON payments(bill_id);
    `);

    // 6. Create trigger to update updated_at on bills
    console.log('Creating trigger for bill updates...');
    await client.query(`
      DROP TRIGGER IF EXISTS update_bills_updated_at ON bills;
      CREATE TRIGGER update_bills_updated_at
          BEFORE UPDATE ON bills
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
    `);

    await client.query('COMMIT');
    console.log('Billing Management migrations completed successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Billing migration failed. Transaction rolled back:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runBillingMigrations();
