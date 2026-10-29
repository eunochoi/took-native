import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';
import type { BackupCipher } from './container';
export async function deriveNativeBackupKey(password: string, salt: Uint8Array) {
  const module = requireOptionalNativeModule<{
    deriveKey: (password: string, salt: string) => Promise<string>;
  }>(Platform.OS === 'ios' ? 'BlooCloud' : 'BlooLocal');
  if (!module) throw new Error('BLOO_NATIVE_REQUIRED');
  return hexToBytes(await module.deriveKey(password, bytesToHex(salt)));
}
function cryptoModule(): typeof import('expo-crypto') {
  if (!requireOptionalNativeModule('ExpoCrypto')) throw new Error('BLOO_NATIVE_REQUIRED');
  return require('expo-crypto');
}
export const backupCipher: BackupCipher = {
  derive: deriveNativeBackupKey,
  random: (length) => cryptoModule().getRandomBytesAsync(length),
  seal: async (data, key, aad) => {
    const { AESEncryptionKey, aesEncryptAsync } = cryptoModule();
    const nativeKey = await AESEncryptionKey.import(key);
    const result = await aesEncryptAsync(data, nativeKey, { additionalData: aad, tagLength: 16 });
    return result.combined();
  },
  open: async (data, key, aad) => {
    const { AESEncryptionKey, AESSealedData, aesDecryptAsync } = cryptoModule();
    const nativeKey = await AESEncryptionKey.import(key);
    return aesDecryptAsync(AESSealedData.fromCombined(data), nativeKey, { additionalData: aad });
  },
};
