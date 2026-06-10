const crypto = require('crypto');

// Use a secure key from env, or a fallback for development.
// It must be exactly 32 bytes (256 bits) for aes-256-cbc.
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default_secret_key_32_bytes_long'; 
const IV_LENGTH = 16; // For AES, this is always 16

/**
 * Encrypts a text string.
 * @param {string} text The text to encrypt.
 * @returns {string} The encrypted text in the format iv:encryptedData
 */
function encrypt(text) {
  if (!text) return text;
  try {
    let iv = crypto.randomBytes(IV_LENGTH);
    let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  } catch (error) {
    console.error('Encryption error:', error);
    return null;
  }
}

/**
 * Decrypts an encrypted string.
 * @param {string} text The encrypted text in the format iv:encryptedData.
 * @returns {string} The decrypted text.
 */
function decrypt(text) {
  if (!text || !text.includes(':')) return text;
  try {
    let textParts = text.split(':');
    let iv = Buffer.from(textParts.shift(), 'hex');
    let encryptedText = Buffer.from(textParts.join(':'), 'hex');
    let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (error) {
    console.error('Decryption error:', error);
    return null;
  }
}

module.exports = { encrypt, decrypt };
