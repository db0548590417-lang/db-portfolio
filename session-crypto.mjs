import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
export function encryptConfig(config, secret) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', createHash('sha256').update(secret).digest(), iv);
  const data = Buffer.concat([cipher.update(JSON.stringify({ config, expires: Date.now() + 30 * 86400000 })), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), data]).toString('base64url');
}
export function decryptConfig(value, secret) {
  try {
    if (!value || value.length > 3800) return null;
    const data = Buffer.from(value, 'base64url');
    if (data.length < 29) return null;
    const decipher = createDecipheriv('aes-256-gcm', createHash('sha256').update(secret).digest(), data.subarray(0, 12));
    decipher.setAuthTag(data.subarray(12, 28));
    const parsed = JSON.parse(Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]).toString());
    return parsed.expires > Date.now() ? parsed.config : null;
  } catch { return null; }
}
