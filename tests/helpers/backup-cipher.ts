import { createCipheriv, createDecipheriv, randomBytes, pbkdf2Sync } from 'node:crypto';
import { concatBytes } from '@noble/hashes/utils.js';
import { PASSWORD_ROUNDS, type BackupCipher } from '../../src/backup/container';

// Independent standard implementation exercises the framing without Expo native mocks.
export const nodeBackupCipher: BackupCipher = {
  derive: async (password, salt) =>
    new Uint8Array(pbkdf2Sync(password, salt, PASSWORD_ROUNDS, 32, 'sha256')),
  random: async (size) => randomBytes(size),
  seal: async (plain, key, aad) => {
    const iv = randomBytes(12);
    const aes = createCipheriv('aes-256-gcm', key, iv);
    aes.setAAD(aad);
    return concatBytes(iv, aes.update(plain), aes.final(), aes.getAuthTag());
  },
  open: async (sealed, key, aad) => {
    const aes = createDecipheriv('aes-256-gcm', key, sealed.subarray(0, 12));
    aes.setAAD(aad);
    aes.setAuthTag(sealed.subarray(sealed.length - 16));
    return concatBytes(aes.update(sealed.subarray(12, -16)), aes.final());
  },
};
