const crypto = require('crypto');

const RAW_KEY = process.env.ENCRYPTION_KEY || 'default_secret_key_32_bytes_long';
// Garantizar siempre una clave de exactamente 32 bytes para aes-256-cbc
const getKeyBuffer = () => {
  const buf = Buffer.from(RAW_KEY);
  if (buf.length === 32) return buf;
  return crypto.createHash('sha256').update(String(RAW_KEY)).digest();
};

const IV_LENGTH = 16; // For AES, this is always 16 bytes (32 hex chars)
const ENCRYPTED_HEX_REGEX = /^[0-9a-fA-F]{32}:[0-9a-fA-F]+$/;

/**
 * Verifica si un texto ya se encuentra en formato encriptado ivHex(32):cipherHex
 */
function isEncrypted(text) {
  if (!text || typeof text !== 'string') return false;
  return ENCRYPTED_HEX_REGEX.test(text.trim());
}

/**
 * Encrypts a text string.
 * @param {string} text The text to encrypt.
 * @returns {string} The encrypted text in the format iv:encryptedData
 */
function encrypt(text) {
  if (!text || typeof text !== 'string') return text;
  if (isEncrypted(text)) return text;
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', getKeyBuffer(), iv);
    let encrypted = cipher.update(Buffer.from(text, 'utf-8'));
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  } catch (error) {
    console.error('Encryption error:', error);
    return text;
  }
}

/**
 * Decrypts an encrypted string.
 * @param {string} text The encrypted text in the format iv:encryptedData.
 * @returns {string} The decrypted text.
 */
function decrypt(text) {
  if (!text || typeof text !== 'string') return text;
  // Si no tiene el formato exacto ivHex(32):cipherHex (ej. es un JSON en texto plano con ':'), devolverlo intacto
  if (!isEncrypted(text)) return text;
  try {
    const [ivHex, encryptedHex] = text.trim().split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const encryptedText = Buffer.from(encryptedHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', getKeyBuffer(), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString('utf-8');
  } catch (error) {
    console.error('Decryption error:', error);
    return text;
  }
}

module.exports = { encrypt, decrypt, isEncrypted };
