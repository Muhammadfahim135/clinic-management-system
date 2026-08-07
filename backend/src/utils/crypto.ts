import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

// AES-256-CBC requires a 32-byte key. We make sure the key is exactly 32 bytes.
const rawKey = process.env.ENCRYPTION_KEY || 'secure_clinic_encryption_key_32c'; // Fallback key
const ENCRYPTION_KEY = Buffer.alloc(32);
Buffer.from(rawKey, 'utf8').copy(ENCRYPTION_KEY);

const IV_LENGTH = 16; // AES block size in bytes

/**
 * Encrypts cleartext using AES-256-CBC.
 * Returns iv:ciphertext in hex format.
 */
export function encrypt(text: string): string {
  if (!text) return '';
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('Encryption failed:', error);
    return text;
  }
}

/**
 * Decrypts iv:ciphertext using AES-256-CBC.
 * Safely falls back to returning the input string if decryption fails.
 */
export function decrypt(text: string): string {
  if (!text) return '';
  try {
    if (!text.includes(':')) {
      return text; // Return unencrypted text directly
    }
    const parts = text.split(':');
    const iv = Buffer.from(parts.shift() || '', 'hex');
    const encryptedHex = parts.join(':');
    const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    // If decryption fails, it might be unencrypted data from seeding
    return text;
  }
}
